const rateLimit = require('express-rate-limit');
require('dotenv').config();

// 基础限流配置
const baseRateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000, // 1分钟
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 60, // 每分钟60次请求
  message: {
    success: false,
    message: '请求过于频繁，请稍后再试'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // 基于IP和User-Agent的限制
  keyGenerator: (req) => {
    const userAgent = req.headers['user-agent'] || '';
    const ip = req.ip || req.connection.remoteAddress;
    return `${ip}:${userAgent}`;
  },
  // 自定义跳过逻辑
  skip: (req) => {
    // 跳过静态文件和健康检查
    if (req.path === '/health' || req.path.startsWith('/css/') || req.path.startsWith('/js/')) {
      return true;
    }
    return false;
  },
  // 处理限流触发
  handler: (req, res) => {
    console.warn(`限流触发: IP=${req.ip}, Path=${req.path}, UserAgent=${req.headers['user-agent']}`);
    res.status(429).json({
      success: false,
      message: '请求过于频繁，请稍后再试或联系客服'
    });
  }
});

// API专用更严格的限流
const apiRateLimiter = rateLimit({
  windowMs: 60000, // 1分钟
  max: 30, // API端点每分钟30次请求
  message: {
    success: false,
    message: 'API请求过于频繁，请稍后再试'
  },
  keyGenerator: (req) => {
    const userAgent = req.headers['user-agent'] || '';
    const ip = req.ip || req.connection.remoteAddress;
    return `${ip}:${userAgent}`;
  },
  handler: (req, res) => {
    console.warn(`API限流触发: IP=${req.ip}, Path=${req.path}`);
    res.status(429).json({
      success: false,
      message: '请求过于频繁，请稍后再试或联系客服'
    });
  }
});

// 订单验证API专用限流（更严格）
const verifyRateLimiter = rateLimit({
  windowMs: 60000, // 1分钟
  max: 10, // 验证端点每分钟10次请求
  message: {
    success: false,
    message: '验证请求过于频繁，请稍后再试或联系客服'
  },
  keyGenerator: (req) => {
    const userAgent = req.headers['user-agent'] || '';
    const ip = req.ip || req.connection.remoteAddress;
    return `${ip}:${userAgent}`;
  },
  handler: (req, res) => {
    console.warn(`验证API限流触发: IP=${req.ip}, Body=${JSON.stringify(req.body)}`);
    res.status(429).json({
      success: false,
      message: '验证失败，请稍后再试或联系客服'
    });
  }
});

module.exports = {
  // 全局限流中间件
  rateLimiter: baseRateLimiter,
  // API限流中间件
  apiRateLimiter,
  // 验证API限流中间件
  verifyRateLimiter
};