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

  // CORS配置
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
  },

  // 代理配置
  trustProxy: process.env.TRUST_PROXY === 'true',

  // 安全头配置
  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"]
      }
    }
  }
};

module.exports = serverConfig;