# CLI 工具规范

## Why
需要提供命令行管理工具来方便管理员进行订单管理、数据导入和系统维护操作。

## ADDED Requirements

### CLI 基础架构
#### Requirement: 系统必须提供命令行管理工具
系统必须提供命令行管理工具，支持订单管理和系统维护的各种操作。

**Scenario:** 管理员需要使用 CLI 工具
```gherkin
Given CLI 工具已正确配置
When 执行 node src/server/cli/index.js --help
Then 系统应该显示所有可用命令的帮助信息
And 帮助信息应该包含命令格式和参数说明
And 命令应该有清晰的错误提示和验证
```

### 订单管理命令
#### Requirement: 系统必须支持添加多次订单
系统必须支持添加多次订单功能，允许管理员将订单添加到多次访问白名单。

**Scenario:** 管理员添加多次使用订单
```gherkin
Given CLI 工具可用
When 执行 node src/server/cli/index.js add ORDER123
Then 系统应该验证订单号格式
And 将订单添加到 multi_orders 表
And 返回添加成功的确认消息
And 如果订单已存在，显示适当的错误信息
```

#### Requirement: 系统必须支持批量导入订单
系统必须支持批量导入订单功能，允许管理员从 CSV 文件批量添加订单。

**Scenario:** 管理员需要批量导入多个订单
```gherkin
Given 有一个包含订单号的 CSV 文件
When 执行 node src/server/cli/index.js import orders.csv
Then 系统应该读取 CSV 文件中的订单号
And 验证每个订单号格式
And 批量添加到数据库
And 显示导入成功的订单数量和失败详情
```

#### Requirement: 系统必须支持订单查询
系统必须支持订单查询功能，允许管理员查看订单的使用情况和访问历史。

**Scenario:** 管理员查询订单使用情况
```gherkin
Given CLI 工具可用
When 执行 node src/server/cli/index.js query ORDER123
Then 系统应该查询订单的使用记录
And 显示订单类型（单次/多次）
And 显示使用次数和最后访问时间
And 如果订单不存在，显示相应的提示信息
```

### 数据库初始化命令
#### Requirement: 系统必须支持数据库初始化
系统必须支持数据库初始化命令，允许管理员初始化或重置数据库结构。

**Scenario:** 首次部署系统或重置数据库
```gherkin
Given 数据库未初始化或需要重置
When 执行 node src/server/cli/index.js init-db
Then 系统应该创建必要的数据库表
And 创建适当的索引
And 显示初始化成功的消息
And 如果数据库已存在，询问是否覆盖
```

### 命令行参数验证
#### Requirement: 系统必须验证命令行参数
系统必须验证命令行参数，确保用户输入的命令和参数格式正确。

**Scenario:** 用户输入无效的命令或参数
```gherkin
Given CLI 工具正在执行
When 提供无效的命令或参数
Then 系统应该显示错误信息
And 显示正确的使用格式
And 退出并返回非零状态码
```

### 配置文件支持
#### Requirement: 系统必须支持配置文件
系统必须支持配置文件，允许管理员自定义数据库路径和其他配置参数。

**Scenario:** 需要自定义数据库路径或其他配置
```gherkin
Given 配置文件存在
When CLI 工具执行任何命令
Then 系统应该读取配置文件中的设置
And 使用配置的数据库路径和其他参数
And 在配置文件不存在时使用默认值
```

## MODIFIED Requirements

### 无

## REMOVED Requirements

### 无