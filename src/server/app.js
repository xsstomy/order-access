const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const cookieSession = require('cookie-session');
require('dotenv').config();

const serverConfig = require('../config/server');
const { initializeDatabase } = require('./db/init');

// 导入中间件
const { rateLimiter } = require('./middleware/rateLimit');

// 导入 API 路由
const verifyAPI = require('./api/verify');
const multiAPI = require('./api/multi');

class OrderAccessServer {
  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupMiddleware() {
    // 安全中间件
    this.app.use(helmet(serverConfig.helmet));

    // CORS配置
    this.app.use(cors(serverConfig.cors));

    // 代理配置
    if (serverConfig.trustProxy) {
      this.app.set('trust proxy', 1);
    }

    // 限流中间件
    this.app.use(rateLimiter);

    // 会话管理
    this.app.use(cookieSession(serverConfig.session));

    // 请求体解析
    this.app.use(express.json({ limit: '10kb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10kb' }));

    // 静态文件服务 - 优先服务项目根目录的 public 文件夹
    this.app.use(express.static(path.join(__dirname, '../../public')));

    // 验证系统静态文件 (CSS/JS)
    this.app.use('/css', express.static(path.join(__dirname, '../public/css')));
    this.app.use('/js', express.static(path.join(__dirname, '../public/js')));
  }

  setupRoutes() {
    // API 路由
    this.app.use('/api/verify', verifyAPI);
    this.app.use('/api/multi', multiAPI);

    // 主页路由 - 服务教程页面
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '../../public/index.html'));
    });

    // 健康检查端点
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });

    // 404处理
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        message: '接口不存在'
      });
    });
  }

  setupErrorHandling() {
    // 全局错误处理中间件
    this.app.use((err, req, res, next) => {
      console.error('服务器错误:', err);

      // 不暴露详细错误信息给客户端
      res.status(500).json({
        success: false,
        message: '服务器内部错误，请稍后再试或联系客服'
      });
    });

    // 处理未捕获的Promise拒绝
    process.on('unhandledRejection', (reason, promise) => {
      console.error('未处理的Promise拒绝:', reason);
    });

    // 处理未捕获的异常
    process.on('uncaughtException', (err) => {
      console.error('未捕获的异常:', err);
      process.exit(1);
    });
  }

  // 启动服务器
  start() {
    try {
      // 初始化数据库
      initializeDatabase();

      const server = this.app.listen(serverConfig.port, () => {
        console.log(`\n🚀 Order Access Server 启动成功!`);
        console.log(`📍 服务地址: http://localhost:${serverConfig.port}`);
        console.log(`🌍 环境: ${serverConfig.nodeEnv}`);
        console.log(`⏰ 启动时间: ${new Date().toLocaleString('zh-CN')}\n`);
      });

      // 优雅关闭
      process.on('SIGTERM', () => {
        console.log('收到 SIGTERM 信号，正在关闭服务器...');
        server.close(() => {
          console.log('服务器已关闭');
          process.exit(0);
        });
      });

      process.on('SIGINT', () => {
        console.log('\n收到 SIGINT 信号，正在关闭服务器...');
        server.close(() => {
          console.log('服务器已关闭');
          process.exit(0);
        });
      });

      return server;
    } catch (error) {
      console.error('启动服务器失败:', error.message);
      process.exit(1);
    }
  }
}

// 如果直接运行此文件，则启动服务器
if (require.main === module) {
  const server = new OrderAccessServer();
  server.start();
}

module.exports = OrderAccessServer;