const express = require('express');
const DeviceIdMiddleware = require('../middleware/deviceId');
const DeviceOperations = require('../db/deviceOperations');

const router = express.Router();
const deviceMiddleware = new DeviceIdMiddleware();
const deviceOps = new DeviceOperations();

// 设置设备ID Cookie
router.post('/set', deviceMiddleware.setDeviceCookie(), (req, res) => {
  try {
    res.json({
      success: true,
      deviceId: req.deviceId,
      message: '设备ID设置成功'
    });
  } catch (error) {
    console.error('设置设备ID失败:', error);
    res.json({
      success: false,
      message: '设置设备ID失败'
    });
  }
});

// 获取当前设备ID
router.get('/current', deviceMiddleware.getDeviceId(), (req, res) => {
  try {
    res.json({
      success: true,
      deviceId: req.deviceId || null,
      message: req.deviceId ? '设备ID获取成功' : '未找到设备ID'
    });
  } catch (error) {
    console.error('获取设备ID失败:', error);
    res.json({
      success: false,
      message: '获取设备ID失败'
    });
  }
});

// 重置设备ID
router.post('/reset', deviceMiddleware.setDeviceCookie(), (req, res) => {
  try {
    const oldDeviceId = req.cookies?.device_id;
    const newDeviceId = req.deviceId;

    res.json({
      success: true,
      oldDeviceId,
      newDeviceId,
      message: '设备ID重置成功'
    });
  } catch (error) {
    console.error('重置设备ID失败:', error);
    res.json({
      success: false,
      message: '重置设备ID失败'
    });
  }
});

// 获取订单的设备绑定信息（管理员API）
router.get('/bindings/:orderNumber', async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const bindings = await deviceOps.getOrderDeviceBindings(orderNumber);

    res.json({
      success: true,
      orderNumber,
      deviceCount: bindings.length,
      maxDevices: deviceOps.maxDevicesPerOrder,
      bindings: bindings.map(binding => ({
        deviceId: binding.device_id.substring(0, 8) + '...', // 只显示前8位，保护隐私
        createdAt: binding.created_formatted,
        lastAccessedAt: binding.last_accessed_formatted
      })),
      message: '获取设备绑定信息成功'
    });
  } catch (error) {
    console.error('获取设备绑定信息失败:', error);
    res.json({
      success: false,
      message: '获取设备绑定信息失败'
    });
  }
});

// 删除设备绑定（管理员API）
router.delete('/bindings/:orderNumber/:deviceId', async (req, res) => {
  try {
    const { orderNumber, deviceId } = req.params;

    // 这里应该添加管理员权限验证
    // if (!req.user || !req.user.isAdmin) {
    //   return res.status(403).json({
    //     success: false,
    //     message: '需要管理员权限'
    //   });
    // }

    const success = await deviceOps.removeDeviceBinding(orderNumber, deviceId);

    if (success) {
      res.json({
        success: true,
        message: '设备绑定删除成功'
      });
    } else {
      res.json({
        success: false,
        message: '设备绑定不存在或删除失败'
      });
    }
  } catch (error) {
    console.error('删除设备绑定失败:', error);
    res.json({
      success: false,
      message: '删除设备绑定失败'
    });
  }
});

// 获取设备的订单历史
router.get('/history/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { limit = 50 } = req.query;

    const history = await deviceOps.getDeviceOrderHistory(deviceId, parseInt(limit));

    res.json({
      success: true,
      deviceId: deviceId.substring(0, 8) + '...', // 保护隐私
      historyCount: history.length,
      history: history.map(item => ({
        orderNumber: item.order_number,
        orderType: item.order_type,
        maxAccess: item.max_access,
        createdAt: item.created_at,
        lastAccessedAt: item.last_accessed_at
      })),
      message: '获取设备历史成功'
    });
  } catch (error) {
    console.error('获取设备历史失败:', error);
    res.json({
      success: false,
      message: '获取设备历史失败'
    });
  }
});

// 验证设备访问权限（内部API）
router.post('/validate', deviceMiddleware.getDeviceId(), async (req, res) => {
  try {
    const { orderNumber } = req.body;

    if (!orderNumber) {
      return res.json({
        success: false,
        message: '订单号不能为空'
      });
    }

    if (!req.deviceId) {
      return res.json({
        success: false,
        message: '设备ID不能为空'
      });
    }

    const validation = await deviceOps.validateDeviceAccess(orderNumber, req.deviceId);

    res.json({
      success: true,
      validation,
      message: validation.allowed ? '设备访问权限验证通过' : '设备访问权限验证失败'
    });
  } catch (error) {
    console.error('验证设备访问权限失败:', error);
    res.json({
      success: false,
      message: '验证设备访问权限失败'
    });
  }
});

module.exports = router;