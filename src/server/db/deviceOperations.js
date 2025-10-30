const dbManager = require('../../config/database');

class DeviceOperations {
  constructor() {
    this.maxDevicesPerOrder = 3;
  }

  /**
   * 检查设备是否已绑定到订单
   */
  async isDeviceBoundToOrder(orderNumber, deviceId) {
    try {
      const binding = await dbManager.get(`
        SELECT id FROM device_bindings
        WHERE order_number = ? AND device_id = ?
      `, [orderNumber, deviceId]);

      return !!binding;
    } catch (error) {
      console.error('检查设备绑定失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取订单的设备绑定数量
   */
  async getDeviceBindingCount(orderNumber) {
    try {
      const result = await dbManager.get(`
        SELECT COUNT(*) as count FROM device_bindings
        WHERE order_number = ?
      `, [orderNumber]);

      return result.count;
    } catch (error) {
      console.error('获取设备绑定数量失败:', error.message);
      throw error;
    }
  }

  /**
   * 创建设备绑定
   */
  async createDeviceBinding(orderNumber, deviceId) {
    try {
      // 检查是否已绑定
      const isBound = await this.isDeviceBoundToOrder(orderNumber, deviceId);
      if (isBound) {
        // 更新最后访问时间
        await this.updateLastAccessed(orderNumber, deviceId);
        return { isNew: false, binding: await this.getDeviceBinding(orderNumber, deviceId) };
      }

      // 检查设备数量限制
      const currentCount = await this.getDeviceBindingCount(orderNumber);
      if (currentCount >= this.maxDevicesPerOrder) {
        throw new Error(`该订单已绑定${this.maxDevicesPerOrder}个设备，无法添加更多设备`);
      }

      // 创建新绑定
      const result = await dbManager.run(`
        INSERT INTO device_bindings (order_number, device_id)
        VALUES (?, ?)
      `, [orderNumber, deviceId]);

      return {
        isNew: true,
        bindingId: result.lastID,
        remainingDevices: this.maxDevicesPerOrder - currentCount - 1
      };
    } catch (error) {
      console.error('创建设备绑定失败:', error.message);
      throw error;
    }
  }

  /**
   * 更新设备的最后访问时间
   */
  async updateLastAccessed(orderNumber, deviceId) {
    try {
      await dbManager.run(`
        UPDATE device_bindings
        SET last_accessed_at = CURRENT_TIMESTAMP
        WHERE order_number = ? AND device_id = ?
      `, [orderNumber, deviceId]);
    } catch (error) {
      console.error('更新最后访问时间失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取设备绑定信息
   */
  async getDeviceBinding(orderNumber, deviceId) {
    try {
      const binding = await dbManager.get(`
        SELECT * FROM device_bindings
        WHERE order_number = ? AND device_id = ?
      `, [orderNumber, deviceId]);

      return binding;
    } catch (error) {
      console.error('获取设备绑定信息失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取订单的所有设备绑定
   */
  async getOrderDeviceBindings(orderNumber) {
    try {
      const bindings = await dbManager.all(`
        SELECT
          id,
          device_id,
          created_at,
          last_accessed_at,
          datetime(last_accessed_at) as last_accessed_formatted,
          datetime(created_at) as created_formatted
        FROM device_bindings
        WHERE order_number = ?
        ORDER BY last_accessed_at DESC
      `, [orderNumber]);

      return bindings;
    } catch (error) {
      console.error('获取订单设备绑定失败:', error.message);
      throw error;
    }
  }

  /**
   * 删除设备绑定
   */
  async removeDeviceBinding(orderNumber, deviceId) {
    try {
      const result = await dbManager.run(`
        DELETE FROM device_bindings
        WHERE order_number = ? AND device_id = ?
      `, [orderNumber, deviceId]);

      return result.changes > 0;
    } catch (error) {
      console.error('删除设备绑定失败:', error.message);
      throw error;
    }
  }

  /**
   * 验证设备访问权限
   */
  async validateDeviceAccess(orderNumber, deviceId) {
    try {
      if (!deviceId) {
        return { allowed: false, reason: 'missing_device_id' };
      }

      const isBound = await this.isDeviceBoundToOrder(orderNumber, deviceId);
      if (isBound) {
        await this.updateLastAccessed(orderNumber, deviceId);
        return { allowed: true, reason: 'existing_device' };
      }

      const currentCount = await this.getDeviceBindingCount(orderNumber);
      if (currentCount >= this.maxDevicesPerOrder) {
        return {
          allowed: false,
          reason: 'device_limit_exceeded',
          currentCount,
          maxDevices: this.maxDevicesPerOrder
        };
      }

      return {
        allowed: true,
        reason: 'new_device_allowed',
        currentCount,
        maxDevices: this.maxDevicesPerOrder,
        remainingDevices: this.maxDevicesPerOrder - currentCount
      };
    } catch (error) {
      console.error('验证设备访问权限失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取设备的订单绑定历史
   */
  async getDeviceOrderHistory(deviceId, limit = 50) {
    try {
      const history = await dbManager.all(`
        SELECT
          db.order_number,
          db.created_at,
          db.last_accessed_at,
          CASE
            WHEN mo.order_number IS NOT NULL THEN 'multi'
            ELSE 'single'
          END as order_type,
          CASE
            WHEN mo.order_number IS NOT NULL THEN mo.max_access
            ELSE NULL
          END as max_access
        FROM device_bindings db
        LEFT JOIN multi_orders mo ON db.order_number = mo.order_number
        WHERE db.device_id = ?
        ORDER BY db.last_accessed_at DESC
        LIMIT ?
      `, [deviceId, limit]);

      return history;
    } catch (error) {
      console.error('获取设备订单历史失败:', error.message);
      throw error;
    }
  }

  /**
   * 清理过期的设备绑定（可选，用于长期维护）
   */
  async cleanupExpiredBindings(daysOld = 365) {
    try {
      const result = await dbManager.run(`
        DELETE FROM device_bindings
        WHERE last_accessed_at < date('now', '-${daysOld} days')
      `);

      return result.changes;
    } catch (error) {
      console.error('清理过期设备绑定失败:', error.message);
      throw error;
    }
  }
}

module.exports = DeviceOperations;