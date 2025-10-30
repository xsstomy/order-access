#!/usr/bin/env node

// 简单的前端开发服务器
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.FRONTEND_PORT || 8080;

// 安全中间件
app.use(helmet({
  contentSecurityPolicy: false // 开发环境禁用CSP以便于开发
}));

// CORS配置 - 允许前端调用后端API
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3002'],
  credentials: true
}));

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));

// 代理API请求到后端（可选）
app.use('/api', (req, res, next) => {
  const timestamp = new Date().toISOString();
  const userAgent = req.headers['user-agent'];
  const referer = req.headers['referer'];

  console.log(`\n🔍 [${timestamp}] API请求到达前端服务器:`);
  console.log(`   方法: ${req.method}`);
  console.log(`   路径: ${req.path}`);
  console.log(`   完整URL: ${req.originalUrl}`);
  console.log(`   User-Agent: ${userAgent}`);
  console.log(`   Referer: ${referer}`);
  console.log(`   远程地址: ${req.ip}`);

  // 检查是否是浏览器直接请求
  if (userAgent && !userAgent.includes('curl') && !userAgent.includes('node')) {
    console.log(`⚠️  检测到浏览器请求，前端应该直接调用后端API！`);
    console.log(`💡 建议的API地址: http://localhost:3002${req.path}`);
  }

  const backendUrl = `http://localhost:3002${req.path}`;

  // 这里可以实现简单的代理逻辑，或者让前端直接调用后端
  const response = {
    success: false,
    message: '前端服务器不支持代理API请求，请直接调用后端API服务器',
    backendUrl: backendUrl,
    debug: {
      timestamp: timestamp,
      method: req.method,
      path: req.path,
      originalUrl: req.originalUrl,
      userAgent: userAgent,
      referer: referer
    }
  };

  console.log(`❌ 返回错误响应:`, response);
  res.status(404).json(response);
});

// SPA路由支持 - 所有非API请求都返回index.html
app.get('*', (req, res) => {
  // 如果是API请求，返回404
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      message: 'API接口不存在'
    });
  }

  // 否则返回前端主页
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('前端服务器错误:', err);
  res.status(500).json({
    success: false,
    message: '前端服务器内部错误'
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`\n🌐 前端开发服务器启动成功!`);
  console.log(`📍 前端地址: http://localhost:${PORT}`);
  console.log(`🔗 后端API: http://localhost:3002`);
  console.log(`⏰ 启动时间: ${new Date().toLocaleString('zh-CN')}`);
  console.log(`\n💡 提示: 前端将直接调用后端API (http://localhost:3002)`);
  console.log(`\n📋 可用端点:`);
  console.log(`   前端应用: http://localhost:${PORT}/`);
  console.log(`   后端健康检查: http://localhost:3002/health`);
  console.log(`   后端API信息: http://localhost:3002/\n`);
});

module.exports = app;