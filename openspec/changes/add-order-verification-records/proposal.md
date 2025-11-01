## Why
管理员需要在管理界面中查看订单验证记录，以便识别哪些订单的验证次数很高，从而发现异常使用模式或潜在的安全问题。

## What Changes
- 在管理界面添加新的"订单验证记录"标签页
- 实现订单验证记录查询功能，默认按验证次数从高到低排序
- 显示每个订单的详细验证信息，包括IP地址、设备ID、验证时间等
- 提供筛选和分页功能，每页显示20个订单编号
- 添加验证记录统计视图
- 实现时间范围筛选，默认展示最近30天，最多不超过1年

## Impact
- Affected specs: 无（新增功能）
- Affected code: src/server/web/admin.html, src/server/web/js/admin.js, 后端API端点
- Database: 需要查询order_usage表的现有数据