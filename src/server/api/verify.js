const express = require('express');
const OrderOperations = require('../db/operations');
const { sessionManager } = require('../middleware/session');
const { verifyRateLimiter } = require('../middleware/rateLimit');

const router = express.Router();
const orderOps = new OrderOperations();

// 订单号验证正则表达式（根据实际需求调整）
const ORDER_NUMBER_REGEX = /^[A-Za-z0-9]{8,30}$/;

// 订单验证端点
router.post('/', verifyRateLimiter, async (req, res) => {
  try {
    const { orderNumber } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || '';

    // 输入验证
    if (!orderNumber) {
      return res.json({
        success: false,
        message: '验证失败，请稍后再试或联系客服'
      });
    }

    // 订单号格式验证
    if (!ORDER_NUMBER_REGEX.test(orderNumber)) {
      console.warn(`无效的订单号格式: ${orderNumber}, IP: ${clientIP}`);
      return res.json({
        success: false,
        message: '验证失败，请稍后再试或联系客服'
      });
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
      console.warn(`订单不存在: ${orderNumber}, IP: ${clientIP}`);
      return res.json({
        success: false,
        message: '验证失败，请稍后再试或联系客服'
      });
    }

    // 处理单次订单
    if (orderInfo.type === 'single') {
      if (orderInfo.used) {
        console.warn(`单次订单已使用: ${orderNumber}, IP: ${clientIP}`);
        return res.json({
          success: false,
          message: '验证失败，请稍后再试或联系客服'
        });
      }

      // 记录使用情况（原子操作）
      await orderOps.recordOrderUsage(orderNumber, clientIP, userAgent, null);

      // 创建会话
      const sessionId = sessionManager.createSession(orderNumber, clientIP);

      console.log(`单次订单验证成功: ${orderNumber}, IP: ${clientIP}, 会话: ${sessionId}`);
      return res.json({
        success: true,
        sessionId,
        message: '验证成功'
      });
    }

    // 处理多次订单
    if (orderInfo.type === 'multi') {
      const remainingAccess = await orderOps.checkMultiOrderRemainingAccess(orderNumber);

      if (remainingAccess === 0) {
        console.warn(`多次订单已用完: ${orderNumber}, IP: ${clientIP}`);
        return res.json({
          success: false,
          message: '验证失败，请稍后再试或联系客服'
        });
      }

      // 记录使用情况
      const sessionId = sessionManager.createSession(orderNumber, clientIP);
      await orderOps.recordOrderUsage(orderNumber, clientIP, userAgent, sessionId);

      console.log(`多次订单验证成功: ${orderNumber}, IP: ${clientIP}, 剩余次数: ${remainingAccess}, 会话: ${sessionId}`);
      return res.json({
        success: true,
        sessionId,
        message: '验证成功',
        remainingAccess: remainingAccess === Infinity ? -1 : remainingAccess - 1 // -1表示无限
      });
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

module.exports = router;