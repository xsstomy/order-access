## Context
管理员反映 `/api/admin/verification-stats` API 返回的数据不是最新的，特别是验证次数和最后验证时间显示陈旧数据。这个问题影响了管理员对订单使用情况的实时监控，需要确保数据的实时性和准确性。

## Goals / Non-Goals
- Goals:
  - 确保 verification-stats API 始终返回最新的验证数据
  - 消除任何导致数据陈旧的缓存机制
  - 提供可靠的数据新鲜度保证
  - 保持良好的API性能
- Non-Goals:
  - 重新设计整个验证记录系统
  - 修改数据库表结构
  - 改变其他API的缓存策略

## Decisions
- Decision: 保持现有的SQL查询逻辑，但添加缓存控制头确保实时性
- Alternatives considered:
  - 添加查询参数强制刷新（复杂度高）
  - 实现数据库触发器通知机制（过度设计）
  - 使用WebSocket实时推送（不符合当前架构）

## Risks / Trade-offs
- [Risk] 禁用缓存可能增加数据库负载 → Mitigation: 监控性能，考虑添加索引优化
- [Risk] 频繁的API请求可能影响服务器性能 → Mitigation: 保留合理的限流机制
- [Trade-off] 数据实时性 vs 性能：优先保证数据准确性

## Migration Plan
1. 修改API响应头，禁用浏览器缓存
2. 验证SQL查询逻辑的正确性
3. 添加数据时间戳验证
4. 测试不同场景下的数据更新
5. 部署修复并监控效果

## Open Questions
- 当前数据库查询是否存在性能问题？
- 前端是否有额外的缓存层需要处理？
- 是否需要添加数据版本控制机制？