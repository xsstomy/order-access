const dbManager = require('../../config/database');

class OrderOperations {
  constructor() {
    // 构造函数不需要特别操作
  }

  // 检查订单是否存在及其类型（支持24小时窗口期）
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

      // 检查单次订单的24小时访问窗口期
      const accessWindow = await dbManager.get(`
        SELECT first_accessed_at, expires_at FROM single_order_access_windows
        WHERE order_number = ?
      `, [orderNumber]);

      if (accessWindow) {
        const now = new Date();
        const expiresAt = new Date(accessWindow.expires_at);

        if (now > expiresAt) {
          // 24小时窗口期已过
          return {
            exists: true,
            type: 'single',
            used: true,
            reason: 'expired_24h',
            expiredAt: accessWindow.expires_at
          };
        } else {
          // 24小时窗口期内，可以访问
          return {
            exists: true,
            type: 'single',
            used: false,
            hasAccessWindow: true,
            windowExpiresAt: accessWindow.expires_at
          };
        }
      }

      // 检查是否有传统使用记录（向后兼容）
      const usage = await dbManager.get(`
        SELECT COUNT(*) as count FROM order_usage WHERE order_number = ?
      `, [orderNumber]);

      if (usage.count > 0) {
        return {
          exists: true,
          type: 'single',
          used: true,
          reason: 'traditional_used'
        };
      }

      // 默认情况下认为是单次订单（未使用过）
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
  async recordOrderUsage(orderNumber, ipAddress, userAgent, sessionId, deviceId = null) {
    try {
      const result = await dbManager.run(`
        INSERT INTO order_usage (order_number, ip_address, user_agent, session_id, device_id)
        VALUES (?, ?, ?, ?, ?)
      `, [orderNumber, ipAddress, userAgent, sessionId, deviceId]);
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

  // 创建24小时访问窗口期（用于单次订单）
  async create24HourAccessWindow(orderNumber) {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24小时后

      const result = await dbManager.run(`
        INSERT OR REPLACE INTO single_order_access_windows
        (order_number, first_accessed_at, expires_at)
        VALUES (?, ?, ?)
      `, [orderNumber, now.toISOString(), expiresAt.toISOString()]);

      console.log(`创建24小时访问窗口期: ${orderNumber}, 过期时间: ${expiresAt.toISOString()}`);
      return {
        success: true,
        expiresAt: expiresAt.toISOString(),
        windowId: result.lastID
      };
    } catch (error) {
      console.error('创建24小时访问窗口期失败:', error.message);
      throw error;
    }
  }

  // 检查24小时访问窗口期状态
  async check24HourAccessWindow(orderNumber) {
    try {
      const window = await dbManager.get(`
        SELECT first_accessed_at, expires_at FROM single_order_access_windows
        WHERE order_number = ?
      `, [orderNumber]);

      if (!window) {
        return { hasWindow: false };
      }

      const now = new Date();
      const expiresAt = new Date(window.expires_at);
      const firstAccessedAt = new Date(window.first_accessed_at);

      return {
        hasWindow: true,
        firstAccessedAt: firstAccessedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        isExpired: now > expiresAt,
        remainingHours: Math.max(0, (expiresAt - now) / (1000 * 60 * 60))
      };
    } catch (error) {
      console.error('检查24小时访问窗口期失败:', error.message);
      throw error;
    }
  }

  // 清理过期的访问窗口期
  async cleanupExpiredAccessWindows() {
    try {
      const now = new Date().toISOString();

      const result = await dbManager.run(`
        DELETE FROM single_order_access_windows
        WHERE expires_at < ?
      `, [now]);

      if (result.changes > 0) {
        console.log(`清理了 ${result.changes} 个过期的24小时访问窗口期`);
      }

      return result.changes;
    } catch (error) {
      console.error('清理过期访问窗口期失败:', error.message);
      throw error;
    }
  }
}

module.exports = OrderOperations;