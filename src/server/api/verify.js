const express = require('express');
const OrderOperations = require('../db/operations');
const DeviceOperations = require('../db/deviceOperations');
const { sessionManager } = require('../middleware/session');
const { verifyRateLimiter } = require('../middleware/rateLimit');
const DeviceIdMiddleware = require('../middleware/deviceId');

const router = express.Router();
const orderOps = new OrderOperations();
const deviceOps = new DeviceOperations();
const deviceMiddleware = new DeviceIdMiddleware();

// 小红书订单编号验证正则表达式（P开头 + 18位数字，共19位）
const ORDER_NUMBER_REGEX = /^P[0-9]{18}$/;

// 订单验证端点
router.post('/', verifyRateLimiter, deviceMiddleware.getDeviceId(), async (req, res) => {
  try {
    const { orderNumber } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || '';
    let deviceId = req.deviceId;

    // 输入验证
    if (!orderNumber) {
      return res.json({
        success: false,
        message: '验证失败，请稍后再试或联系客服'
      });
    }

    // 订单号格式验证 - 小红书订单编号格式
    if (!ORDER_NUMBER_REGEX.test(orderNumber)) {
      console.warn(`无效的订单号格式: ${orderNumber}, IP: ${clientIP}`);
      return res.json({
        success: false,
        message: '验证失败，请稍后再试或联系客服'
      });
    }

    // 设备ID验证（必须有设备ID才能继续）
    if (!deviceId) {
      console.warn(`缺少设备ID: ${orderNumber}, IP: ${clientIP}`);

      // 如果没有设备ID，生成一个新的
      deviceId = deviceMiddleware.generateDeviceId();
      deviceMiddleware.setCookie(res, deviceId);

      console.log(`生成新设备ID: ${deviceId.substring(0, 8)}..., IP: ${clientIP}`);
    }

    // 检查是否已有有效会话
    const existingSessionId = req.headers['x-session-id'] || req.query.sessionId;
    if (existingSessionId && sessionManager.validateSession(existingSessionId, clientIP)) {
      const session = sessionManager.getSession(existingSessionId);
      if (session.orderNumber === orderNumber) {
        return res.json({
          success: true,
          sessionId: existingSessionId,
          message: '验证成功'
        });
      }
    }

    // 检查订单信息
    const orderInfo = await orderOps.checkOrder(orderNumber);

    if (!orderInfo.exists) {
      console.warn(`订单不存在: ${orderNumber}, IP: ${clientIP}, Device: ${deviceId.substring(0, 8)}...`);
      return res.json({
        success: false,
        message: '验证失败，请稍后再试或联系客服'
      });
    }

    // 验证设备访问权限
    const deviceValidation = await deviceOps.validateDeviceAccess(orderNumber, deviceId);

    if (!deviceValidation.allowed) {
      console.warn(`设备访问被拒绝: ${orderNumber}, IP: ${clientIP}, Device: ${deviceId.substring(0, 8)}..., Reason: ${deviceValidation.reason}`);

      let message = '验证失败，请稍后再试或联系客服';

      if (deviceValidation.reason === 'device_limit_exceeded') {
        message = `该订单已在${deviceValidation.currentCount}个设备上验证，最多支持${deviceValidation.maxDevices}个设备`;
      }

      return res.json({
        success: false,
        message,
        deviceLimit: deviceValidation.reason === 'device_limit_exceeded' ? {
          current: deviceValidation.currentCount,
          max: deviceValidation.maxDevices
        } : null
      });
    }

    // 处理单次订单
    if (orderInfo.type === 'single') {
      if (orderInfo.used) {
        let message = '验证失败，请稍后再试或联系客服';

        if (orderInfo.reason === 'expired_24h') {
          message = '该订单已超过24小时访问期限，请联系客服';
          console.warn(`单次订单24小时窗口期已过期: ${orderNumber}, IP: ${clientIP}, 过期时间: ${orderInfo.expiredAt}`);
        } else {
          console.warn(`单次订单已使用: ${orderNumber}, IP: ${clientIP}`);
        }

        return res.json({
          success: false,
          message,
          reason: orderInfo.reason || 'used'
        });
      }

      // 如果订单没有24小时访问窗口期，创建一个
      let windowInfo = null;
      if (!orderInfo.hasAccessWindow) {
        windowInfo = await orderOps.create24HourAccessWindow(orderNumber);
      } else {
        windowInfo = {
          expiresAt: orderInfo.windowExpiresAt
        };
      }

      // 记录使用情况（原子操作，包含设备ID）
      await orderOps.recordOrderUsage(orderNumber, clientIP, userAgent, null, deviceId);

      // 创建设备绑定（如果是新设备）
      if (deviceValidation.reason === 'new_device_allowed') {
        await deviceOps.createDeviceBinding(orderNumber, deviceId);
      }

      // 创建会话
      const sessionId = sessionManager.createSession(orderNumber, clientIP);

      console.log(`单次订单验证成功: ${orderNumber}, IP: ${clientIP}, Device: ${deviceId.substring(0, 8)}..., 会话: ${sessionId}`);

      const response = {
        success: true,
        sessionId,
        message: '验证成功',
        deviceInfo: deviceValidation.reason === 'new_device_allowed' ? {
          isNewDevice: true,
          remainingDevices: deviceValidation.remainingDevices
        } : null
      };

      // 如果有24小时窗口期信息，添加到响应中
      if (windowInfo && windowInfo.expiresAt) {
        response.accessWindow = {
          expiresAt: windowInfo.expiresAt,
          remainingHours: Math.max(0, (new Date(windowInfo.expiresAt) - new Date()) / (1000 * 60 * 60))
        };
      }

      return res.json(response);
    }

    // 处理多次订单
    if (orderInfo.type === 'multi') {
      // 多次订单不再受24小时窗口期限制，移除相关检查

      const remainingAccess = await orderOps.checkMultiOrderRemainingAccess(orderNumber);

      if (remainingAccess === 0) {
        console.warn(`多次订单已用完: ${orderNumber}, IP: ${clientIP}`);
        return res.json({
          success: false,
          message: '验证失败，请稍后再试或联系客服'
        });
      }

      // 记录使用情况（包含设备ID）
      const sessionId = sessionManager.createSession(orderNumber, clientIP);
      await orderOps.recordOrderUsage(orderNumber, clientIP, userAgent, sessionId, deviceId);

      // 创建设备绑定（如果是新设备）
      let deviceInfo = null;
      if (deviceValidation.reason === 'new_device_allowed') {
        const bindingResult = await deviceOps.createDeviceBinding(orderNumber, deviceId);
        deviceInfo = {
          isNewDevice: true,
          remainingDevices: bindingResult.remainingDevices
        };
      }

      console.log(`多次订单验证成功: ${orderNumber}, IP: ${clientIP}, Device: ${deviceId.substring(0, 8)}..., 剩余次数: ${remainingAccess}, 会话: ${sessionId}`);

      const response = {
        success: true,
        sessionId,
        message: '验证成功',
        remainingAccess: remainingAccess === Infinity ? -1 : remainingAccess - 1, // -1表示无限
        deviceInfo
      };

      // 添加会话过期时间
      const sessionMaxAge = parseInt(process.env.SESSION_MAX_AGE) || 7200000; // 默认2小时
      const sessionExpiresAt = new Date(Date.now() + sessionMaxAge);
      response.sessionExpiresAt = sessionExpiresAt.toISOString();

      // 多次订单不再包含24小时窗口期信息

      return res.json(response);
    }

    // 默认失败响应
    return res.json({
      success: false,
      message: '验证失败，请稍后再试或联系客服'
    });

  } catch (error) {
    console.error('订单验证错误:', error);
    return res.json({
      success: false,
      message: '验证失败，请稍后再试或联系客服'
    });
  }
});

// 会话验证端点
router.get('/session', (req, res) => {
  try {
    const sessionId = req.headers['x-session-id'] || req.query.sessionId;
    const clientIP = req.ip || req.connection.remoteAddress;

    if (!sessionId) {
      return res.json({
        success: false,
        message: '未提供会话ID'
      });
    }

    if (!sessionManager.validateSession(sessionId, clientIP)) {
      return res.json({
        success: false,
        message: '会话无效或已过期'
      });
    }

    const session = sessionManager.getSession(sessionId);
    return res.json({
      success: true,
      session: {
        orderNumber: session.orderNumber,
        createdAt: session.createdAt,
        lastAccessedAt: session.lastAccessedAt
      }
    });

  } catch (error) {
    console.error('会话验证错误:', error);
    return res.json({
      success: false,
      message: '会话验证失败'
    });
  }
});

// 会话状态检查端点 (为教程页面集成提供)
router.get('/status', (req, res) => {
  try {
    const sessionId = req.headers['x-session-id'] || req.query.sessionId;
    const clientIP = req.ip || req.connection.remoteAddress;

    if (!sessionId) {
      return res.json({
        success: false,
        valid: false,
        message: '未提供会话ID'
      });
    }

    if (!sessionManager.validateSession(sessionId, clientIP)) {
      return res.json({
        success: false,
        valid: false,
        message: '会话无效或已过期'
      });
    }

    const session = sessionManager.getSession(sessionId);
    const sessionMaxAge = parseInt(process.env.SESSION_MAX_AGE) || 7200000; // 默认2小时
    const sessionExpiresAt = new Date(session.createdAt.getTime() + sessionMaxAge);

    return res.json({
      success: true,
      valid: true,
      sessionId: sessionId,
      sessionExpiresAt: sessionExpiresAt.toISOString(),
      orderNumber: session.orderNumber
    });

  } catch (error) {
    console.error('会话状态检查错误:', error);
    return res.json({
      success: false,
      valid: false,
      message: '会话状态检查失败'
    });
  }
});

// 会话刷新端点 (为教程页面集成提供)
router.post('/refresh', (req, res) => {
  try {
    const sessionId = req.headers['x-session-id'] || req.query.sessionId;
    const clientIP = req.ip || req.connection.remoteAddress;

    if (!sessionId) {
      return res.json({
        success: false,
        message: '未提供会话ID'
      });
    }

    if (!sessionManager.validateSession(sessionId, clientIP)) {
      return res.json({
        success: false,
        message: '会话无效或已过期'
      });
    }

    // 刷新会话访问时间
    const session = sessionManager.getSession(sessionId);
    session.lastAccessedAt = new Date();

    const sessionMaxAge = parseInt(process.env.SESSION_MAX_AGE) || 7200000; // 默认2小时
    const sessionExpiresAt = new Date(session.createdAt.getTime() + sessionMaxAge);

    return res.json({
      success: true,
      message: '会话已刷新',
      sessionExpiresAt: sessionExpiresAt.toISOString()
    });

  } catch (error) {
    console.error('会话刷新错误:', error);
    return res.json({
      success: false,
      message: '会话刷新失败'
    });
  }
});

// 退出会话端点
router.post('/logout', (req, res) => {
  try {
    const sessionId = req.headers['x-session-id'] || req.query.sessionId;

    if (sessionId) {
      sessionManager.removeSession(sessionId);
    }

    return res.json({
      success: true,
      message: '已退出登录'
    });

  } catch (error) {
    console.error('退出会话错误:', error);
    return res.json({
      success: false,
      message: '退出失败'
    });
  }
});

// 检查24小时访问窗口期状态
router.get('/window/:orderNumber', async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const clientIP = req.ip || req.connection.remoteAddress;

    // 输入验证 - 小红书订单编号格式
    if (!orderNumber || !ORDER_NUMBER_REGEX.test(orderNumber)) {
      return res.json({
        success: false,
        message: '无效的订单号格式'
      });
    }

    // 检查订单信息
    const orderInfo = await orderOps.checkOrder(orderNumber);

    if (!orderInfo.exists) {
      return res.json({
        success: false,
        message: '订单不存在'
      });
    }

    // 单次和多次订单都支持24小时窗口期
    const windowStatus = await orderOps.check24HourAccessWindow(orderNumber, orderInfo.type);

    return res.json({
      success: true,
      orderNumber,
      orderType: orderInfo.type,
      windowStatus
    });

  } catch (error) {
    console.error('检查访问窗口期错误:', error);
    return res.json({
      success: false,
      message: '检查访问窗口期失败'
    });
  }
});

// 清理过期的访问窗口期（管理员接口）
router.post('/cleanup', async (req, res) => {
  try {
    const cleanedCount = await orderOps.cleanupExpiredAccessWindows();

    return res.json({
      success: true,
      message: `清理了 ${cleanedCount} 个过期的访问窗口期`,
      cleanedCount
    });

  } catch (error) {
    console.error('清理过期访问窗口期错误:', error);
    return res.json({
      success: false,
      message: '清理过期访问窗口期失败'
    });
  }
});

module.exports = router;