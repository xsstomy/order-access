# 数据库时区修正技术设计

## 当前时区处理分析

### SQLite 时区行为
- `CURRENT_TIMESTAMP` 返回 UTC 时间：`2025-10-31 03:00:01`
- 用户期望北京时间：`2025-10-31 11:00:01`
- 时差：8小时（UTC+8）

### 受影响的表结构
```sql
-- 多次订单表
multi_orders.created_at DATETIME DEFAULT CURRENT_TIMESTAMP

-- 设备绑定表
device_bindings.created_at DATETIME DEFAULT CURRENT_TIMESTAMP
device_bindings.last_accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP

-- 订单使用记录表
order_usage.accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP

-- 24小时访问窗口期表（如果存在）
order_access_windows.first_accessed_at DATETIME
order_access_windows.expires_at DATETIME
```

## 技术解决方案

### 1. 数据库连接时区配置
在 `DatabaseManager.connect()` 中添加时区设置：
```javascript
// 设置 SQLite 时区为北京时间
this.db.run('PRAGMA time_zone = "+08:00"');
```

### 2. 自定义时间戳函数
创建 Beijing 时间戳函数：
```sql
CREATE FUNCTION IF NOT EXISTS beijing_timestamp() RETURNS TEXT AS
  SELECT datetime('now', '+08:00');
```

### 3. 表结构迁移
更新表的时间戳默认值：
```sql
-- 修改现有表
ALTER TABLE multi_orders RENAME TO multi_orders_old;
CREATE TABLE multi_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT (datetime('now', '+08:00')),
  max_access INTEGER DEFAULT NULL
);
INSERT INTO multi_orders SELECT * FROM multi_orders_old;
DROP TABLE multi_orders_old;
```

### 4. 应用层时间处理统一
在 `OrderOperations` 类中统一时间处理：
```javascript
// 获取北京时间
getBeijingTime() {
  return new Date(new Date().getTime() + 8 * 60 * 60 * 1000);
}

// 格式化为数据库时间字符串
formatDateTime(date) {
  return date.toISOString().replace('T', ' ').substring(0, 19);
}
```

### 5. 现有数据迁移脚本
```sql
-- 更新现有时间戳数据（加8小时）
UPDATE multi_orders SET created_at = datetime(created_at, '+08:00');
UPDATE device_bindings SET
  created_at = datetime(created_at, '+08:00'),
  last_accessed_at = datetime(last_accessed_at, '+08:00');
UPDATE order_usage SET accessed_at = datetime(accessed_at, '+08:00');
```

## 实施策略

### 阶段1：数据库配置
1. 修改 `DatabaseManager` 添加时区配置
2. 创建北京时间函数
3. 测试新时间戳生成

### 阶段2：应用层修改
1. 更新 `OrderOperations` 时间处理逻辑
2. 修改相关 API 的时间处理
3. 确保前端时间显示正确

### 阶段3：数据迁移
1. 备份现有数据库
2. 执行时间戳转换脚本
3. 验证数据一致性

### 阶段4：测试验证
1. 验证新记录使用北京时间
2. 检查现有数据显示正确
3. 测试24小时窗口期计算

## 风险缓解

### 数据安全
- 迁移前强制数据库备份
- 提供回滚脚本
- 分批验证数据

### 功能影响
- 保持 API 接口兼容性
- 渐进式部署
- 监控关键功能正常运行

### 性能考虑
- 优化时间戳查询
- 缓存时区转换结果
- 最小化数据库操作开销