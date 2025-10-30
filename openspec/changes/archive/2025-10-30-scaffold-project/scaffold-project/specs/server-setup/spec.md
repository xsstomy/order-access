# 服务器设置规范

## Why
需要建立基础的 Express 服务器架构来支持订单验证功能，包括安全中间件、API 端点和静态文件服务。

## ADDED Requirements

### Express 服务器基础架构
#### Requirement: 系统必须提供 Express 服务器基础框架
系统必须提供完整的 Express 服务器基础框架，支持启动 HTTP 服务器并处理请求。

**Scenario:** 开发者启动开发服务器
```gherkin
Given 项目已经初始化依赖
When 执行 npm run dev 命令
Then 服务器应该在端口 3000 启动
And 服务器应该能够处理 HTTP 请求
And 控制台应该显示启动成功的消息
```

### 订单验证 API 端点
#### Requirement: 系统必须提供订单验证 API 端点
系统必须提供订单验证 API 端点，支持接收订单号并返回验证结果。

**Scenario:** 用户提交订单号进行验证
```gherkin
Given 用户向 POST /api/verify 发送包含 orderNumber 的请求
And 订单号格式正确
When 系统处理验证请求
Then 系统应该验证订单号的有效性
And 成功时返回 { success: true, sessionId: string }
And 失败时返回 { success: false, message: "验证失败，请稍后再试或联系客服" }
```

### 安全中间件
#### Requirement: 系统必须实现限流中间件
系统必须实现限流中间件，防止恶意请求和暴力破解攻击。

**Scenario:** 同一 IP 地址频繁请求验证
```gherkin
Given 限流中间件已配置为每分钟 60 次请求
When 同一 IP 在 1 分钟内超过 60 次请求 /api/verify
Then 第 61 次请求应该被拒绝
And 返回 HTTP 状态码 429
And 返回限流相关的错误消息
```

#### Requirement: 系统必须实现会话管理中间件
系统必须实现会话管理中间件，支持用户会话的创建、验证和过期管理。

**Scenario:** 用户验证成功后的会话保持
```gherkin
Given 用户已成功验证订单号
When 用户在 2 小时内再次访问系统
Then 系统应该识别用户的会话
And 不需要重新验证订单号
And 会话在 2 小时后自动过期
```

### 错误处理
#### Requirement: 系统必须统一错误响应格式
系统必须统一错误响应格式，防止信息泄露和枚举攻击。

**Scenario:** 任何验证失败的情况
```gherkin
Given 订单验证失败（订单不存在、已使用等）
When 系统返回错误响应
Then 所有错误响应都应该使用相同的消息："验证失败，请稍后再试或联系客服"
And 不暴露具体的失败原因
And 返回 HTTP 状态码 200（防止枚举攻击）
```

### 静态文件服务
#### Requirement: 系统必须提供静态文件服务
系统必须提供静态文件服务，支持前端页面的访问和资源加载。

**Scenario:** 用户访问首页
```gherkin
Given 静态文件已配置
When 用户访问 GET /
Then 系统应该返回 index.html 页面
And 页面应该包含订单号输入表单
And 页面应该正确加载 CSS 和 JavaScript 资源
```

## MODIFIED Requirements

### 无

## REMOVED Requirements

### 无