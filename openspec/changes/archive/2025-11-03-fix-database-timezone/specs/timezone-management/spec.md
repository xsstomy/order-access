# 时区管理规范

## MODIFIED Requirements

### Requirement: 数据库时区配置
系统SHALL配置数据库使用北京时间（UTC+8）作为默认时区。

#### Scenario: 数据库连接时区设置
当系统启动数据库连接时，系统MUST自动设置 SQLite 时区为北京时间，确保所有 `CURRENT_TIMESTAMP` 调用返回北京时间。

#### Scenario: 自定义时间戳函数
系统MUST提供 `beijing_timestamp()` 函数，用于显式获取北京时间戳。

### Requirement: 应用层时间处理统一
系统SHALL使用统一的北京时间处理逻辑处理所有应用层的时间。

#### Scenario: 订单创建时间
当创建新订单记录时，系统MUST在 `created_at` 字段存储北京时间戳。

#### Scenario: 访问记录时间
当记录用户访问时，系统MUST在 `accessed_at` 字段存储北京时间戳。

#### Scenario: 设备绑定时间
当创建或更新设备绑定时，系统MUST在 `created_at` 和 `last_accessed_at` 字段存储北京时间戳。

### Requirement: 现有数据时区转换
系统SHALL将现有的 UTC 时间戳数据转换为北京时间显示。

#### Scenario: 历史数据迁移
系统MUST提供迁移脚本，将所有现有时间戳字段从 UTC 时间转换为北京时间（加8小时）。

#### Scenario: 数据一致性验证
迁移完成后，系统MUST验证所有时间戳数据的正确性和一致性。

### Requirement: 前端时间显示
前端界面SHALL正确显示北京时间。

#### Scenario: 管理界面时间显示
管理员界面中的所有时间字段MUST显示北京时间格式。

#### Scenario: 用户界面时间显示
用户界面中的访问记录、订单信息等时间MUST显示北京时间。

### Requirement: 24小时窗口期时区处理
24小时访问窗口期的计算SHALL基于北京时间。

#### Scenario: 窗口期创建时间
创建24小时访问窗口期时，系统MUST在 `first_accessed_at` 和 `expires_at` 使用北京时间。

#### Scenario: 窗口期过期检查
检查窗口期是否过期时，系统MUST使用北京时间进行比较计算。

## ADDED Requirements

### Requirement: 时区转换工具
系统SHALL提供时区转换工具函数。

#### Scenario: UTC转北京时间
系统MUST提供 `convertToBeijingTime(utcTime)` 函数，将 UTC 时间字符串转换为北京时间。

#### Scenario: 时间格式化
系统MUST提供 `formatBeijingTime(date)` 函数，将 Date 对象格式化为北京时间字符串。

### Requirement: 数据库迁移安全
时区数据迁移SHALL保证数据安全。

#### Scenario: 迁移前备份
执行时间戳迁移前，系统MUST自动创建数据库备份。

#### Scenario: 迁移回滚
系统MUST提供迁移失败时的回滚脚本和恢复机制。

#### Scenario: 迁移验证
迁移完成后，系统MUST自动验证数据完整性和时区正确性。