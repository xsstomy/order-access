## Why
管理员反馈 `/api/admin/verification-stats` API 获取的数据不是最新的，验证次数和最后验证时间显示陈旧数据，影响管理员对订单使用情况的实时监控和判断。

## What Changes
- 修复 verification-stats API 的数据缓存问题，确保返回实时数据
- 优化数据库查询，确保获取最新的验证记录
- 添加强制刷新机制，避免浏览器缓存导致的数据不更新
- 改进错误处理和日志记录，便于问题排查
- 验证数据新鲜度的测试和监控机制

## Impact
- Affected specs: admin-interface（修改现有验证记录管理功能）
- Affected code: src/server/api/admin.js (verification-stats 端点)
- Database: 查询优化，确保实时读取 order_usage 表数据
- Frontend: 可能需要调整前端缓存策略