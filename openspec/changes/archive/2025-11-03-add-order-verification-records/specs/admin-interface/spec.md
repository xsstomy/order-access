## ADDED Requirements
### Requirement: Order Verification Records Management
管理员界面 SHALL 提供订单验证记录查询和统计功能，允许管理员查看和分析订单验证行为。

#### Scenario: View verification records with sorting
- **WHEN** 管理员访问"订单验证记录"标签页
- **THEN** 系统显示所有订单的验证记录，默认按验证次数从高到低排序
- **AND** 显示订单号、验证次数、首次验证时间、最后验证时间
- **AND** 默认显示最近30天的验证记录
- **AND** 每页显示20个订单编号

#### Scenario: View detailed verification history
- **WHEN** 管理员点击具体订单的"查看详情"
- **THEN** 系统显示该订单的所有验证记录，包括验证时间、IP地址、设备ID、用户代理、会话ID
- **AND** 记录按时间倒序排列，最新的验证记录在前

#### Scenario: Filter verification records
- **WHEN** 管理员使用筛选条件（订单号、时间范围、IP地址）
- **THEN** 系统根据条件过滤验证记录
- **AND** 显示符合条件的记录数量
- **AND** 时间范围筛选默认为最近30天，最大可选择1年

#### Scenario: Default date range configuration
- **WHEN** 管理员首次访问"订单验证记录"页面
- **THEN** 时间范围筛选器自动设置为最近30天
- **AND** 系统阻止选择超过1年的时间范围
- **AND** 显示当前选择的时间范围信息

#### Scenario: Pagination of verification records
- **WHEN** 验证记录超过页面显示限制
- **THEN** 系统提供分页导航
- **AND** 每页显示20个订单编号
- **AND** 分页导航显示页码和总记录数


## MODIFIED Requirements
### Requirement: Admin Navigation
管理员界面 SHALL 在导航栏中添加"订单验证记录"标签页，与其他管理功能并列显示。

#### Scenario: Access verification records tab
- **WHEN** 管理员登录管理界面
- **THEN** 导航栏显示"订单验证记录"选项
- **AND** 点击该选项切换到验证记录查询页面