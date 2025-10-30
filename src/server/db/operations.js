const dbManager = require('../../config/database');

class OrderOperations {
  constructor() {
    // 构造函数不需要特别操作
  }

  // 检查订单是否存在及其类型
  async checkOrder(orderNumber) {
    try {
      // 检查是否为多次订单
      const multiOrder = await dbManager.get(`
        SELECT max_access FROM multi_orders WHERE order_number = ?
      `, [orderNumber]);

      if (multiOrder) {
        return {
          exists: true,
          type: 'multi',
          maxAccess: multiOrder.max_access
        };
      }

      // 检查是否已使用过的单次订单
      const usage = await dbManager.get(`
        SELECT COUNT(*) as count FROM order_usage WHERE order_number = ?
      `, [orderNumber]);

      if (usage.count > 0) {
        return {
          exists: true,
          type: 'single',
          used: true
        };
      }

      // 默认情况下认为是单次订单（假设订单号格式正确）
      return {
        exists: true,
        type: 'single',
        used: false
      };
    } catch (error) {
      console.error('检查订单失败:', error.message);
      throw error;
    }
  }

  // 记录订单使用情况（原子操作）
  async recordOrderUsage(orderNumber, ipAddress, userAgent, sessionId) {
    try {
      const result = await dbManager.run(`
        INSERT INTO order_usage (order_number, ip_address, user_agent, session_id)
        VALUES (?, ?, ?, ?)
      `, [orderNumber, ipAddress, userAgent, sessionId]);
      return result;
    } catch (error) {
      console.error('记录订单使用失败:', error.message);
      throw error;
    }
  }

  // 添加多次订单到白名单
  async addMultiOrder(orderNumber, maxAccess = null) {
    try {
      const result = await dbManager.run(`
        INSERT OR IGNORE INTO multi_orders (order_number, max_access)
        VALUES (?, ?)
      `, [orderNumber, maxAccess]);
      return result;
    } catch (error) {
      console.error('添加多次订单失败:', error.message);
      throw error;
    }
  }

  // 批量添加多次订单
  async addMultipleMultiOrders(orders) {
    try {
      let insertedCount = 0;
      for (const order of orders) {
        const result = await dbManager.run(`
          INSERT OR IGNORE INTO multi_orders (order_number, max_access)
          VALUES (?, ?)
        `, [order.orderNumber, order.maxAccess || null]);

        if (result.changes > 0) {
          insertedCount++;
        }
      }
      return insertedCount;
    } catch (error) {
      console.error('批量添加多次订单失败:', error.message);
      throw error;
    }
  }

  // 查询订单使用情况
  async getOrderUsage(orderNumber) {
    try {
      // 检查是否为多次订单
      const multiOrder = await dbManager.get(`
        SELECT order_number, created_at, max_access FROM multi_orders
        WHERE order_number = ?
      `, [orderNumber]);

      // 获取使用记录
      const usageRecords = await dbManager.all(`
        SELECT ip_address, user_agent, accessed_at, session_id
        FROM order_usage
        WHERE order_number = ?
        ORDER BY accessed_at DESC
      `, [orderNumber]);

      return {
        isMultiOrder: !!multiOrder,
        multiOrderInfo: multiOrder,
        usageCount: usageRecords.length,
        usageRecords
      };
    } catch (error) {
      console.error('查询订单使用情况失败:', error.message);
      throw error;
    }
  }

  // 检查多次订单的剩余访问次数
  async checkMultiOrderRemainingAccess(orderNumber) {
    try {
      const multiOrder = await dbManager.get(`
        SELECT max_access FROM multi_orders WHERE order_number = ?
      `, [orderNumber]);

      if (!multiOrder) {
        return null; // 不是多次订单
      }

      if (multiOrder.max_access === null) {
        return Infinity; // 无限制访问
      }

      const usage = await dbManager.get(`
        SELECT COUNT(*) as count FROM order_usage WHERE order_number = ?
      `, [orderNumber]);

      return Math.max(0, multiOrder.max_access - usage.count);
    } catch (error) {
      console.error('检查多次订单剩余访问次数失败:', error.message);
      throw error;
    }
  }
}

module.exports = OrderOperations;