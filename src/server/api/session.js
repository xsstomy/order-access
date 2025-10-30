const express = require('express');
const { sessionManager } = require('../middleware/session');

const router = express.Router();

// 获取会话状态 (前端专用API)
router.get('/status', (req, res) => {
  try {
    const sessionId = req.headers['x-session-id'] || req.query.sessionId;
    const clientIP = req.ip || req.connection.remoteAddress;

    if (!sessionId) {
      return res.json({
        success: false,
        authenticated: false,
        message: '未提供会话ID'
      });
    }

    if (!sessionManager.validateSession(sessionId, clientIP)) {
      return res.json({
        success: false,
        authenticated: false,
        message: '会话无效或已过期'
      });
    }

    const session = sessionManager.getSession(sessionId);
    const sessionExpiresAt = new Date(session.createdAt.getTime() + 2 * 60 * 60 * 1000); // 2小时

    return res.json({
      success: true,
      authenticated: true,
      data: {
        sessionId: sessionId,
        orderNumber: session.orderNumber,
        createdAt: session.createdAt,
        lastAccessedAt: session.lastAccessedAt,
        expiresAt: sessionExpiresAt,
        remainingTime: Math.max(0, sessionExpiresAt - new Date())
      }
    });

  } catch (error) {
    console.error('会话状态检查错误:', error);
    return res.json({
      success: false,
      authenticated: false,
      message: '会话状态检查失败'
    });
  }
});

// 延长会话 (前端专用API)
router.post('/extend', (req, res) => {
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

    // 延长会话 (通过更新最后访问时间)
    const session = sessionManager.getSession(sessionId);
    session.lastAccessedAt = new Date();

    const sessionExpiresAt = new Date(session.createdAt.getTime() + 2 * 60 * 60 * 1000); // 2小时

    return res.json({
      success: true,
      message: '会话已延长',
      data: {
        expiresAt: sessionExpiresAt,
        remainingTime: Math.max(0, sessionExpiresAt - new Date())
      }
    });

  } catch (error) {
    console.error('延长会话错误:', error);
    return res.json({
      success: false,
      message: '延长会话失败'
    });
  }
});

// 获取所有活跃会话 (管理员API)
router.get('/active', (req, res) => {
  try {
    // 这里应该添加管理员权限验证
    // if (!req.user || !req.user.isAdmin) {
    //   return res.status(403).json({
    //     success: false,
    //     message: '需要管理员权限'
    //   });
    // }

    const activeSessions = sessionManager.getAllSessions();
    const sessionList = Object.keys(activeSessions).map(sessionId => {
      const session = activeSessions[sessionId];
      return {
        sessionId: sessionId.substring(0, 8) + '...', // 只显示前8位，保护隐私
        orderNumber: session.orderNumber,
        createdAt: session.createdAt,
        lastAccessedAt: session.lastAccessedAt,
        clientIP: session.clientIP
      };
    });

    res.json({
      success: true,
      data: {
        total: sessionList.length,
        sessions: sessionList
      }
    });
  } catch (error) {
    console.error('获取活跃会话错误:', error);
    res.json({
      success: false,
      message: '获取活跃会话失败'
    });
  }
});

// 清理过期会话 (管理员API)
router.post('/cleanup', (req, res) => {
  try {
    // 这里应该添加管理员权限验证
    // if (!req.user || !req.user.isAdmin) {
    //   return res.status(403).json({
    //     success: false,
    //     message: '需要管理员权限'
    //   });
    // }

    const cleanedCount = sessionManager.cleanupExpiredSessions();

    res.json({
      success: true,
      message: `清理了 ${cleanedCount} 个过期会话`,
      data: {
        cleanedCount
      }
    });
  } catch (error) {
    console.error('清理过期会话错误:', error);
    res.json({
      success: false,
      message: '清理过期会话失败'
    });
  }
});

// 获取会话统计信息
router.get('/stats', (req, res) => {
  try {
    const stats = sessionManager.getSessionStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取会话统计错误:', error);
    res.json({
      success: false,
      message: '获取会话统计失败'
    });
  }
});

module.exports = router;