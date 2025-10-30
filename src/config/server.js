require('dotenv').config();

const serverConfig = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // 会话配置
  session: {
    secret: process.env.SESSION_SECRET || 'change-this-secret-key',
    maxAge: parseInt(process.env.SESSION_MAX_AGE) || 7200000, // 2小时
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  },

  // CORS配置 - 增强配置支持前后端分离
  cors: {
    origin: function (origin, callback) {
      // 允许的域名列表
      const allowedOrigins = [
        process.env.FRONTEND_URL,
        'http://localhost:3000',
        'http://localhost:8080',
        'http://localhost:5500',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:8080',
        'http://127.0.0.1:5500'
      ].filter(Boolean);

      // 开发环境允许所有来源
      if (process.env.NODE_ENV === 'development') {
        return callback(null, true);
      }

      // 生产环境检查白名单
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-ID', 'X-Internal-API-Key'],
    exposedHeaders: ['X-Total-Count']
  },

  // 代理配置
  trustProxy: process.env.TRUST_PROXY === 'true',

  // 安全头配置
  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://s.immersivetranslate.com"]
      }
    }
  }
};

module.exports = serverConfig;