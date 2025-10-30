# 项目脚手架设计

## 架构决策

### 1. 项目结构
```
order-access/
├── src/
│   ├── server/
│   │   ├── app.js              # Express 应用主文件
│   │   ├── api/
│   │   │   └── verify.js       # 订单验证 API
│   │   ├── db/
│   │   │   ├── init.js         # 数据库初始化
│   │   │   └── operations.js   # 数据库操作
│   │   ├── middleware/
│   │   │   ├── rateLimit.js    # 限流中间件
│   │   │   └── session.js      # 会话管理
│   │   └── cli/
│   │       └── index.js        # CLI 工具入口
│   ├── public/
│   │   ├── index.html          # 主页面
│   │   ├── css/
│   │   │   └── style.css       # 样式文件
│   │   └── js/
│   │       └── app.js          # 前端逻辑
│   └── config/
│       ├── database.js         # 数据库配置
│       └── server.js           # 服务器配置
├── package.json
├── .env.example
└── README.md
```

### 2. 技术选择理由
- **Express.js**: 轻量级、成熟的 Node.js 框架
- **SQLite**: 无需额外服务器，文件型数据库，易于部署和迁移
- **better-sqlite3**: 同步操作，性能优异，API 简洁
- **express-rate-limit**: 成熟的限流解决方案
- **cookie-session**: 简单的会话管理，适合轻量级应用

### 3. 安全考虑
- **统一失败消息**: 防止订单号枚举攻击
- **限流机制**: 防止暴力破解
- **原子操作**: 防止并发访问导致的计数错误
- **输入验证**: 严格的订单号格式校验

### 4. 数据库设计
```sql
-- 多次订单白名单表
CREATE TABLE multi_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    max_access INTEGER DEFAULT NULL  -- NULL 表示无限制
);

-- 订单使用记录表
CREATE TABLE order_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    user_agent TEXT,
    accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    session_id TEXT
);

-- 创建索引提高查询性能
CREATE INDEX idx_multi_orders_order_number ON multi_orders(order_number);
CREATE INDEX idx_order_usage_order_number ON order_usage(order_number);
CREATE INDEX idx_order_usage_session_id ON order_usage(session_id);
```

### 5. API 设计
- `POST /api/verify`: 订单验证接口
  - 输入: `{ orderNumber: string }`
  - 成功: `{ success: true, sessionId: string }`
  - 失败: `{ success: false, message: "验证失败，请稍后再试或联系客服" }`

- `POST /api/multi/add`: 添加多次订单（内部使用）
  - 输入: `{ orderNumber: string, maxAccess?: number }`
  - 输出: `{ success: boolean, message: string }`

### 6. CLI 工具设计
```bash
# 添加多次订单
node src/server/cli/index.js add ORDER123

# 批量导入
node src/server/cli/index.js import orders.csv

# 查询订单使用情况
node src/server/cli/index.js query ORDER123

# 初始化数据库
node src/server/cli/index.js init-db
```

## 实现顺序
1. 基础项目结构和配置
2. 数据库初始化和操作模块
3. Express 服务器基础框架
4. 订单验证 API 实现
5. 安全中间件（限流、会话）
6. CLI 工具开发
7. 前端页面
8. 集成测试和优化