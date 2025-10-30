const crypto = require('crypto');

class SessionManager {
  constructor() {
    this.activeSessions = new Map(); // 存储活跃会话
  }

  // 生成安全的会话ID
  generateSessionId() {
    return crypto.randomBytes(32).toString('hex');
  }

  // 创建新会话
  createSession(orderNumber, ipAddress) {
    const sessionId = this.generateSessionId();
    const session = {
      id: sessionId,
      orderNumber,
      ipAddress,
      createdAt: new Date(),
      lastAccessedAt: new Date()
    };

    this.activeSessions.set(sessionId, session);

    // 设置会话过期清理
    setTimeout(() => {
      this.removeSession(sessionId);
    }, 7200000); // 2小时

    console.log(`创建会话: ${sessionId}, 订单: ${orderNumber}, IP: ${ipAddress}`);
    return sessionId;
  }

  // 验证会话
  validateSession(sessionId, ipAddress) {
    const session = this.activeSessions.get(sessionId);

    if (!session) {
      return false;
    }

    // 检查IP地址是否匹配（可选的安全措施）
    if (session.ipAddress !== ipAddress) {
      console.warn(`会话IP不匹配: 会话IP=${session.ipAddress}, 当前IP=${ipAddress}`);
      // 可以选择是否强制IP匹配，这里暂时不强制
    }

    // 更新最后访问时间
    session.lastAccessedAt = new Date();

    return true;
  }

  // 移除会话
  removeSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      this.activeSessions.delete(sessionId);
      console.log(`移除会话: ${sessionId}, 订单: ${session.orderNumber}`);
    }
  }

  // 获取会话信息
  getSession(sessionId) {
    return this.activeSessions.get(sessionId);
  }

  // 清理过期会话
  cleanupExpiredSessions() {
    const now = new Date();
    const expiredSessions = [];

    for (const [sessionId, session] of this.activeSessions.entries()) {
      const sessionAge = now - session.createdAt;
      if (sessionAge > 7200000) { // 2小时
        expiredSessions.push(sessionId);
      }
    }

    expiredSessions.forEach(sessionId => {
      this.removeSession(sessionId);
    });

    console.log(`清理了 ${expiredSessions.length} 个过期会话`);
    return expiredSessions.length;
  }

  // 获取活跃会话统计
  getStats() {
    return {
      totalSessions: this.activeSessions.size,
      sessionsByOrder: this.getOrderSessionStats()
    };
  }

  // 按订单统计会话
  getOrderSessionStats() {
    const stats = {};

    for (const session of this.activeSessions.values()) {
      const orderNumber = session.orderNumber;
      stats[orderNumber] = (stats[orderNumber] || 0) + 1;
    }

    return stats;
  }
}

// 创建全局会话管理器实例
const sessionManager = new SessionManager();

// 定期清理过期会话
setInterval(() => {
  sessionManager.cleanupExpiredSessions();
}, 300000); // 每5分钟清理一次

// Express中间件
const sessionMiddleware = (req, res, next) => {
  // 从请求头或查询参数获取会话ID
  const sessionId = req.headers['x-session-id'] || req.query.sessionId;

  if (sessionId) {
    // 验证会话
    if (sessionManager.validateSession(sessionId, req.ip)) {
      req.sessionId = sessionId;
      req.session = sessionManager.getSession(sessionId);
    }
  }

  next();
};

module.exports = {
  sessionMiddleware,
  sessionManager
};