const crypto = require('crypto');

class DeviceIdMiddleware {
  constructor() {
    this.cookieName = 'device_id';
    this.cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 365 * 24 * 60 * 60 * 1000, // 365天
      path: '/'
    };
  }

  /**
   * 设置设备ID Cookie的中间件
   */
  setDeviceCookie() {
    return (req, res, next) => {
      // 检查是否已有设备ID Cookie
      if (req.cookies && req.cookies[this.cookieName]) {
        req.deviceId = req.cookies[this.cookieName];
        return next();
      }

      // 尝试从请求中获取设备ID（用于恢复场景）
      const { deviceId } = req.body;
      if (deviceId && this.isValidDeviceId(deviceId)) {
        this.setCookie(res, deviceId);
        req.deviceId = deviceId;
        return next();
      }

      // 生成新的设备ID
      const newDeviceId = this.generateDeviceId();
      this.setCookie(res, newDeviceId);
      req.deviceId = newDeviceId;

      next();
    };
  }

  /**
   * 获取设备ID的中间件
   */
  getDeviceId() {
    return (req, res, next) => {
      // 优先从Cookie获取
      if (req.cookies && req.cookies[this.cookieName]) {
        req.deviceId = req.cookies[this.cookieName];
        return next();
      }

      // 从请求体获取（用于API调用）
      const { deviceId } = req.body;
      if (deviceId && this.isValidDeviceId(deviceId)) {
        req.deviceId = deviceId;
        return next();
      }

      // 从查询参数获取
      const { deviceId: queryDeviceId } = req.query;
      if (queryDeviceId && this.isValidDeviceId(queryDeviceId)) {
        req.deviceId = queryDeviceId;
        return next();
      }

      // 从Header获取
      const headerDeviceId = req.headers['x-device-id'];
      if (headerDeviceId && this.isValidDeviceId(headerDeviceId)) {
        req.deviceId = headerDeviceId;
        return next();
      }

      // 没有设备ID
      req.deviceId = null;
      next();
    };
  }

  /**
   * 设置Cookie
   */
  setCookie(res, deviceId) {
    const cookieValue = `${this.cookieName}=${deviceId}`;
    const options = [
      `Path=${this.cookieOptions.path}`,
      `HttpOnly`,
      `SameSite=${this.cookieOptions.sameSite}`,
      `Max-Age=${this.cookieOptions.maxAge}`
    ];

    if (this.cookieOptions.secure) {
      options.push('Secure');
    }

    res.setHeader('Set-Cookie', `${cookieValue}; ${options.join('; ')}`);
  }

  /**
   * 生成设备ID
   */
  generateDeviceId() {
    return crypto.randomUUID();
  }

  /**
   * 验证设备ID格式
   */
  isValidDeviceId(deviceId) {
    if (!deviceId || typeof deviceId !== 'string') {
      return false;
    }

    // 简单的UUID格式验证
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(deviceId);
  }

  /**
   * 清除设备ID Cookie
   */
  clearDeviceCookie(res) {
    res.clearCookie(this.cookieName, {
      path: this.cookieOptions.path,
      httpOnly: this.cookieOptions.httpOnly,
      secure: this.cookieOptions.secure,
      sameSite: this.cookieOptions.sameSite
    });
  }
}

module.exports = DeviceIdMiddleware;