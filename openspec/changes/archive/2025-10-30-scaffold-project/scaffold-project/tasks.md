# 项目脚手架搭建任务清单

## 任务列表

### 1. 项目基础设置
- [x] 创建 package.json 文件，包含所需依赖和脚本
  - express, sqlite3, express-rate-limit, cookie-session
  - 开发依赖：nodemon, jest
  - 脚本：dev, start, test, init-db
- [x] 创建 .env.example 文件，定义环境变量模板
- [x] 创建 .gitignore 文件，排除 node_modules 和数据库文件
- [x] 创建基础目录结构 src/server, src/public, src/config

### 2. 数据库模块开发
- [x] 实现 src/config/database.js 配置文件
- [x] 实现 src/server/db/init.js 数据库初始化脚本
  - 创建 multi_orders 表
  - 创建 order_usage 表
  - 创建必要索引
- [x] 实现 src/server/db/operations.js 数据库操作接口
  - 查询订单是否存在和类型
  - 记录订单使用情况
  - 添加多次订单到白名单
  - 原子操作保证并发安全

### 3. Express 服务器开发
- [x] 实现 src/server/app.js Express 应用主文件
  - 基础中间件配置
  - 路由设置
  - 错误处理
- [x] 实现 src/config/server.js 服务器配置
  - 端口、会话配置
  - 安全相关设置

### 4. 中间件开发
- [x] 实现 src/server/middleware/rateLimit.js 限流中间件
  - 每分钟 60 次请求限制
  - 基于 IP 和 User-Agent 限制
- [x] 实现 src/server/middleware/session.js 会话中间件
  - 2小时会话保持
  - 安全的会话配置

### 5. API 端点开发
- [x] 实现 src/server/api/verify.js 订单验证 API
  - POST /api/verify 端点
  - 统一成功/失败响应格式
  - 输入验证和安全检查
- [x] 实现 src/server/api/multi.js 多次订单管理 API
  - POST /api/multi/add 端点
  - 内部使用的白名单管理

### 6. CLI 工具开发
- [x] 实现 src/server/cli/index.js CLI 主入口
  - 命令行参数解析
  - 帮助信息显示
- [x] 实现 CLI 子命令
  - add: 添加单个多次订单
  - import: 批量导入 CSV 文件
  - query: 查询订单使用情况
  - init-db: 初始化数据库

### 7. 前端页面开发
- [x] 创建 src/public/index.html 主页面
  - 订单号输入表单
  - 响应式布局
- [x] 创建 src/public/css/style.css 样式文件
  - 现代化 UI 设计
  - 移动端适配
- [x] 创建 src/public/js/app.js 前端逻辑
  - 表单提交处理
  - 错误消息显示
  - 会话状态管理

### 8. 集成测试和验证
- [x] 测试服务器启动功能
  - 验证 npm run dev 命令正常工作
  - 确认端口 3000 可访问
- [x] 测试数据库功能
  - 验证数据库初始化
  - 测试订单查询和记录功能
- [x] 测试 API 端点
  - 验证订单验证逻辑
  - 测试限流和会话功能
- [x] 测试 CLI 工具
  - 验证所有命令正常工作
  - 测试错误处理和参数验证
- [x] 测试前端页面
  - 验证页面正常加载
  - 测试表单提交和响应处理

### 9. 文档完善
- [x] 更新 README.md 文件
  - 添加安装和使用说明
  - 包含 API 文档和 CLI 使用示例
- [x] 创建 API 文档
  - 端点说明和参数格式
  - 响应格式和错误码

## 验收标准

项目完成时应满足以下标准：
- [x] 执行 `npm install && npm run dev` 能成功启动服务器
- [x] 数据库能正确初始化，包含所需的表和索引
- [x] API 端点能正确响应请求，返回预期格式
- [x] CLI 工具能执行所有命令，正确处理参数和错误
- [x] 前端页面能正常显示和交互
- [x] 所有安全措施（限流、统一错误消息）正确实现
- [x] 项目结构清晰，代码有适当的注释和文档

## 依赖关系

- 任务 1-2 必须最先完成（基础设置和数据库）
- 任务 3-5 依赖任务 1-2（服务器和 API）
- 任务 6 可以并行开发（CLI 工具）
- 任务 7 依赖任务 3-5（前端需要 API）
- 任务 8-9 必须最后完成（测试和文档）