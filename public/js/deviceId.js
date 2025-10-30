/**
 * 设备ID管理模块
 * 使用双通道ID策略：Cookie + localStorage
 */
class DeviceIdManager {
  constructor() {
    this.deviceId = null;
    this.cookieName = 'device_id';
    this.storageKey = 'deviceId';
  }

  /**
   * 获取当前设备ID
   * @returns {Promise<string>} 设备ID
   */
  async getDeviceId() {
    if (this.deviceId) {
      return this.deviceId;
    }

    // 1. 首先尝试从Cookie获取
    this.deviceId = this.getCookieDeviceId();

    if (this.deviceId) {
      // 如果Cookie中有ID，同步到localStorage
      this.syncToLocalStorage(this.deviceId);
      return this.deviceId;
    }

    // 2. 尝试从localStorage恢复
    this.deviceId = this.getDeviceIdFromStorage();

    if (this.deviceId) {
      // 如果localStorage中有ID，请求服务器设置Cookie
      await this.restoreCookie(this.deviceId);
      return this.deviceId;
    }

    // 3. 都没有则生成新的设备ID
    this.deviceId = this.generateDeviceId();
    await this.setDeviceId(this.deviceId);

    return this.deviceId;
  }

  /**
   * 从Cookie获取设备ID
   */
  getCookieDeviceId() {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === this.cookieName) {
        return value;
      }
    }
    return null;
  }

  /**
   * 从localStorage获取设备ID
   */
  getDeviceIdFromStorage() {
    try {
      return localStorage.getItem(this.storageKey);
    } catch (error) {
      console.warn('localStorage访问失败:', error);
      return null;
    }
  }

  /**
   * 生成新的设备ID
   */
  generateDeviceId() {
    // 生成UUID v4
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * 同步到localStorage
   */
  syncToLocalStorage(deviceId) {
    try {
      localStorage.setItem(this.storageKey, deviceId);
    } catch (error) {
      console.warn('localStorage同步失败:', error);
    }
  }

  /**
   * 设置设备ID（Cookie + localStorage）
   */
  async setDeviceId(deviceId) {
    // 请求服务器设置Cookie
    await this.setDeviceCookie(deviceId);

    // 同步到localStorage
    this.syncToLocalStorage(deviceId);
  }

  /**
   * 请求服务器设置设备ID Cookie
   */
  async setDeviceCookie(deviceId) {
    try {
      const response = await fetch('/api/device/set', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ deviceId })
      });

      if (!response.ok) {
        console.warn('设置设备Cookie失败:', response.statusText);
      }
    } catch (error) {
      console.warn('设置设备Cookie请求失败:', error);
    }
  }

  /**
   * 恢复Cookie
   */
  async restoreCookie(deviceId) {
    await this.setDeviceCookie(deviceId);
  }

  /**
   * 重置设备ID
   */
  async resetDeviceId() {
    this.deviceId = this.generateDeviceId();
    await this.setDeviceId(this.deviceId);
    return this.deviceId;
  }

  /**
   * 检查设备ID是否有效
   */
  isValidDeviceId(deviceId) {
    return deviceId && typeof deviceId === 'string' && deviceId.length > 0;
  }
}

// 创建全局实例
const deviceIdManager = new DeviceIdManager();

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DeviceIdManager;
} else {
  window.DeviceIdManager = DeviceIdManager;
  window.deviceIdManager = deviceIdManager;
}