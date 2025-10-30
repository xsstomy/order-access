# 前后端分离部署指南

## 概述

本系统已完成前后端分离改造，支持独立部署和扩展。

## 架构说明

### 前端 (Frontend)
- **技术栈**: 原生HTML/CSS/JavaScript
- **端口**: 8080 (开发环境) 或生产环境配置
- **功能**: 用户界面、教程展示、订单验证界面
- **依赖**: 无外部依赖，仅使用浏览器原生API

### 后端 (Backend)
- **技术栈**: Node.js + Express
- **端口**: 3002 (开发环境) 或生产环境配置
- **功能**: RESTful API服务、订单验证、会话管理
- **数据库**: SQLite

## 开发环境部署

### 方式一：分别启动服务

1. **启动后端API服务器**
   ```bash
   # 设置环境变量
   export PORT=3002
   export NODE_ENV=development

   # 启动后端服务
   node src/server/app.js
   ```

2. **启动前端开发服务器**
   ```bash
   # 在新终端窗口
   export FRONTEND_PORT=8080

   # 启动前端服务
   node frontend-server.js
   ```

3. **访问应用**
   - 前端应用: http://localhost:8080
   - 后端API: http://localhost:3002
   - API文档: http://localhost:3002/

### 方式二：使用npm脚本

```bash
# 启动后端 (端口3002)
npm run start:backend

# 启动前端 (端口8080)
npm run start:frontend
```

## 生产环境部署

### 部署方式一：简单分离部署

1. **后端部署**
   ```bash
   # 设置生产环境变量
   export NODE_ENV=production
   export PORT=3000

   # 启动后端服务
   node src/server/app.js

   # 使用PM2管理进程 (推荐)
   pm2 start src/server/app.js --name "order-access-api" --env production
   ```

2. **前端部署**
   ```bash
   # 使用nginx或Apache提供静态文件服务
   # 将public/目录内容部署到web服务器

   # nginx配置示例
   server {
       listen 80;
       server_name your-domain.com;

       root /path/to/public;
       index index.html;

       # 前端路由支持
       location / {
           try_files $uri $uri/ /index.html;
       }

       # API代理 (可选)
       location /api/ {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

### 部署方式二：Docker容器化部署

1. **创建Dockerfile (后端)**
   ```dockerfile
   FROM node:16-alpine

   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production

   COPY src/ ./src/
   COPY database/ ./database/

   EXPOSE 3000

   CMD ["node", "src/server/app.js"]
   ```

2. **创建Dockerfile (前端)**
   ```dockerfile
   FROM nginx:alpine

   COPY public/ /usr/share/nginx/html/
   COPY nginx.conf /etc/nginx/nginx.conf

   EXPOSE 80
   ```

3. **Docker Compose部署**
   ```yaml
   version: '3.8'

   services:
     backend:
       build: .
       ports:
         - "3000:3000"
       environment:
         - NODE_ENV=production
       volumes:
         - ./database:/app/database

     frontend:
       build:
         context: .
         dockerfile: Dockerfile.frontend
       ports:
         - "80:80"
       depends_on:
         - backend
   ```

## 环境变量配置

### 后端环境变量
```bash
NODE_ENV=production              # 运行环境
PORT=3000                       # API服务端口
DB_PATH=./database/orders.db   # 数据库文件路径
SESSION_SECRET=your-secret-key  # 会话加密密钥
CORS_ORIGIN=https://your-domain.com  # 允许的前端域名
TRUST_PROXY=true                # 信任代理头
```

### 前端环境变量
前端通过`api.js`中的配置自动检测后端地址：
- 开发环境: `http://localhost:3002`
- 生产环境: 相对路径或配置的域名

## API端点说明

### 认证相关
- `POST /api/verify` - 订单验证
- `GET /api/verify/status` - 验证状态检查
- `POST /api/verify/logout` - 退出登录

### 教程内容
- `GET /api/tutorial/overview` - 教程概要 (公开)
- `GET /api/tutorial/content` - 完整教程内容 (需认证)
- `GET /api/tutorial/sections/:id` - 特定章节 (需认证)

### 会话管理
- `GET /api/session/status` - 会话状态
- `POST /api/session/extend` - 延长会话

### 设备管理
- `POST /api/device/set` - 设置设备ID
- `GET /api/device/current` - 获取当前设备

### 系统监控
- `GET /health` - 健康检查
- `GET /` - API信息概览

## 安全配置

### CORS配置
后端已配置CORS支持，生产环境需要配置正确的域名：
```javascript
// src/config/server.js
cors: {
  origin: ['https://your-domain.com'], // 生产环境域名
  credentials: true
}
```

### HTTPS配置
生产环境建议使用HTTPS：
```nginx
server {
    listen 443 ssl;
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    # 其他配置...
}
```

## 监控和日志

### 应用监控
- 健康检查端点: `/health`
- 系统信息包含会话统计、数据库状态等

### 日志配置
```bash
# 使用PM2的日志功能
pm2 logs order-access-api

# 配置日志轮转
pm2 install pm2-logrotate
```

## 性能优化

### 后端优化
- 使用Redis缓存会话 (可选)
- 配置数据库连接池
- 启用gzip压缩

### 前端优化
- 静态资源CDN加速
- 启用浏览器缓存
- 压缩CSS/JS文件

## 故障排查

### 常见问题

1. **CORS错误**
   - 检查CORS配置是否包含前端域名
   - 确认API请求包含正确的headers

2. **会话丢失**
   - 检查localStorage是否正常工作
   - 确认后端会话管理正常

3. **API请求失败**
   - 检查网络连接
   - 查看后端日志
   - 验证API端点是否正确

### 调试方法
```bash
# 查看后端日志
tail -f logs/app.log

# 测试API连通性
curl http://localhost:3000/health

# 检查前端加载
curl -I http://localhost:8080/
```

## 版本升级

### 升级步骤
1. 备份数据库文件
2. 停止现有服务
3. 更新代码文件
4. 重启服务
5. 验证功能正常

### 回滚计划
1. 恢复数据库备份
2. 切换到上一个版本代码
3. 重启服务

## 联系支持

如遇到部署问题，请查看：
1. 应用日志文件
2. 系统错误日志
3. 网络和防火墙配置
4. 依赖服务状态

---

**注意**: 部署前请确保所有环境变量正确配置，并测试所有API端点正常工作。