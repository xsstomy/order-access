const express = require('express');
const OrderOperations = require('../db/operations');
const { apiRateLimiter } = require('../middleware/rateLimit');

const router = express.Router();
const orderOps = new OrderOperations();

// 内部API密钥验证（简单实现）
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'internal-api-key-change-in-production';

// 验证内部API密钥
const verifyInternalKey = (req, res, next) => {
  const apiKey = req.headers['x-internal-api-key'];

  if (!apiKey || apiKey !== INTERNAL_API_KEY) {
    console.warn(`内部API访问被拒绝: IP=${req.ip}, Key=${apiKey}`);
    return res.status(403).json({
      success: false,
      message: '无权限访问此接口'
    });
  }

  next();
};

// 添加多次订单到白名单
router.post('/add', apiRateLimiter, verifyInternalKey, async (req, res) => {
  try {
    const { orderNumber, maxAccess } = req.body;

    // 输入验证
    if (!orderNumber || typeof orderNumber !== 'string') {
      return res.json({
        success: false,
        message: '订单号不能为空且必须是字符串'
      });
    }

    if (maxAccess !== undefined && (typeof maxAccess !== 'number' || maxAccess < 1)) {
      return res.json({
        success: false,
        message: '最大访问次数必须是大于0的数字'
      });
    }

    // 添加多次订单
    const result = await orderOps.addMultiOrder(orderNumber.trim(), maxAccess || null);

    if (result.changes > 0) {
      console.log(`成功添加多次订单: ${orderNumber}, 最大访问次数: ${maxAccess || '无限制'}`);
      return res.json({
        success: true,
        message: '多次订单添加成功',
        orderNumber: orderNumber.trim(),
        maxAccess: maxAccess || null
      });
    } else {
      return res.json({
        success: false,
        message: '订单已存在于白名单中'
      });
    }

  } catch (error) {
    console.error('添加多次订单失败:', error);
    return res.json({
      success: false,
      message: '添加失败，请检查输入参数'
    });
  }
});

// 批量添加多次订单
router.post('/batch-add', apiRateLimiter, verifyInternalKey, async (req, res) => {
  try {
    const { orders } = req.body;

    if (!Array.isArray(orders) || orders.length === 0) {
      return res.json({
        success: false,
        message: '订单列表不能为空且必须是数组'
      });
    }

    // 验证订单格式
    const validOrders = [];
    for (const order of orders) {
      if (order.orderNumber && typeof order.orderNumber === 'string') {
        validOrders.push({
          orderNumber: order.orderNumber.trim(),
          maxAccess: order.maxAccess || null
        });
      }
    }

    if (validOrders.length === 0) {
      return res.json({
        success: false,
        message: '没有有效的订单数据'
      });
    }

    // 批量添加
    const insertedCount = await orderOps.addMultipleMultiOrders(validOrders);

    console.log(`批量添加多次订单完成: ${insertedCount}/${validOrders.length} 个订单成功添加`);
    return res.json({
      success: true,
      message: `批量添加完成，成功添加 ${insertedCount} 个订单`,
      total: validOrders.length,
      inserted: insertedCount,
      failed: validOrders.length - insertedCount
    });

  } catch (error) {
    console.error('批量添加多次订单失败:', error);
    return res.json({
      success: false,
      message: '批量添加失败'
    });
  }
});

// 查询多次订单信息
router.get('/info/:orderNumber', apiRateLimiter, verifyInternalKey, async (req, res) => {
  try {
    const { orderNumber } = req.params;

    if (!orderNumber) {
      return res.json({
        success: false,
        message: '订单号不能为空'
      });
    }

    // 获取订单使用情况
    const usageInfo = await orderOps.getOrderUsage(orderNumber.trim());

    if (!usageInfo.isMultiOrder) {
      return res.json({
        success: false,
        message: '订单不在多次订单白名单中'
      });
    }

    // 计算剩余访问次数
    const remainingAccess = await orderOps.checkMultiOrderRemainingAccess(orderNumber.trim());

    return res.json({
      success: true,
      orderNumber: orderNumber.trim(),
      isMultiOrder: true,
      maxAccess: usageInfo.multiOrderInfo.max_access,
      usageCount: usageInfo.usageCount,
      remainingAccess: remainingAccess === Infinity ? -1 : remainingAccess,
      createdAt: usageInfo.multiOrderInfo.created_at,
      lastUsage: usageInfo.usageRecords.length > 0 ? usageInfo.usageRecords[0].accessed_at : null
    });

  } catch (error) {
    console.error('查询多次订单信息失败:', error);
    return res.json({
      success: false,
      message: '查询失败'
    });
  }
});

// 获取多次订单列表（分页）
router.get('/list', apiRateLimiter, verifyInternalKey, (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const db = orderOps.db;

    // 获取多次订单列表
    const ordersStmt = db.prepare(`
      SELECT
        order_number,
        created_at,
        max_access,
        (SELECT COUNT(*) FROM order_usage WHERE order_number = mo.order_number) as usage_count
      FROM multi_orders mo
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);

    const orders = ordersStmt.all(limit, offset);

    // 获取总数
    const countStmt = db.prepare('SELECT COUNT(*) as total FROM multi_orders');
    const { total } = countStmt.get();

    return res.json({
      success: true,
      orders: orders.map(order => ({
        orderNumber: order.order_number,
        createdAt: order.created_at,
        maxAccess: order.max_access,
        usageCount: order.usage_count,
        remainingAccess: order.max_access === null ? -1 : Math.max(0, order.max_access - order.usage_count)
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('获取多次订单列表失败:', error);
    return res.json({
      success: false,
      message: '获取列表失败'
    });
  }
});

// 删除多次订单
router.delete('/:orderNumber', apiRateLimiter, verifyInternalKey, (req, res) => {
  try {
    const { orderNumber } = req.params;

    if (!orderNumber) {
      return res.json({
        success: false,
        message: '订单号不能为空'
      });
    }

    const db = orderOps.db;
    const stmt = db.prepare('DELETE FROM multi_orders WHERE order_number = ?');
    const result = stmt.run(orderNumber.trim());

    if (result.changes > 0) {
      console.log(`删除多次订单成功: ${orderNumber}`);
      return res.json({
        success: true,
        message: '订单删除成功'
      });
    } else {
      return res.json({
        success: false,
        message: '订单不存在'
      });
    }

  } catch (error) {
    console.error('删除多次订单失败:', error);
    return res.json({
      success: false,
      message: '删除失败'
    });
  }
});

module.exports = router;