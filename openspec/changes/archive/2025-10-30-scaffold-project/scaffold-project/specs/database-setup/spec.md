# 数据库设置规范

## Why
需要建立稳定可靠的数据库系统来存储订单信息和使用记录，确保数据一致性和查询性能。

## ADDED Requirements

### 数据库初始化
#### Requirement: 系统必须能够自动初始化 SQLite 数据库
系统必须能够自动初始化 SQLite 数据库，创建所需的表结构和索引。

**Scenario:** 首次运行项目时
```gherkin
Given 数据库文件不存在
When 执行数据库初始化命令
Then 系统应该创建 SQLite 数据库文件
And 创建 multi_orders 表
And 创建 order_usage 表
And 创建必要的索引
And 返回初始化成功的消息
```

### 多次订单表结构
#### Requirement: 系统必须维护多次订单白名单表
系统必须维护多次订单白名单表，支持多次访问订单的管理和查询。

**Scenario:** 添加多次使用订单到白名单
```gherkin
Given multi_orders 表已存在
When 执行添加多次订单命令
Then 系统应该插入新的订单记录
And 记录订单号、创建时间和访问限制（如有）
And 确保订单号唯一性约束
And 返回添加成功的确认
```

### 订单使用记录表
#### Requirement: 系统必须记录每次订单验证使用
系统必须记录每次订单验证使用，跟踪订单的访问历史和使用情况。

**Scenario:** 用户验证订单号时
```gherkin
Given order_usage 表已存在
When 用户成功验证订单号
Then 系统应该记录验证事件
And 包含订单号、IP地址、User-Agent、访问时间和会话ID
And 确保记录的原子性
```

### 数据库操作接口
#### Requirement: 系统必须提供数据库操作接口
系统必须提供数据库操作接口，支持订单查询、记录添加和统计功能。

**Scenario:** 服务器需要查询订单信息
```gherkin
Given 数据库操作模块已加载
When 调用查询订单方法
Then 系统应该返回订单是否存在
And 返回订单类型（单次/多次）
And 返回剩余访问次数（如适用）
And 所有操作应该是异步的（使用 sqlite3）
```

### 数据库安全性
#### Requirement: 系统必须确保数据库操作的原子性
系统必须确保数据库操作的原子性，防止并发访问导致的数据不一致。

**Scenario:** 并发访问同一订单时
```gherkin
Given 多个请求同时验证同一单次订单
When 系统处理第一个请求
Then 只有第一个请求应该成功
And 后续请求应该失败
And 数据库状态保持一致性
```

### 数据库维护
#### Requirement: 系统必须提供数据库维护功能
系统必须提供数据库维护功能，支持订单使用情况的查询和统计分析。

**Scenario:** 管理员需要查询订单使用情况
```gherkin
Given CLI 工具已配置
When 执行查询订单使用情况命令
Then 系统应该显示订单的使用历史
And 包括访问时间、IP地址等信息
And 支持按订单号或时间范围过滤
```

## MODIFIED Requirements

### 无

## REMOVED Requirements

### 无