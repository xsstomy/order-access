## Why
当前系统对多次订单施加了24小时访问窗口期限制，这不符合多次订单的设计初衷。用户购买多次订单应该能够长期、重复访问内容，而不应在首次验证后24小时就被阻止访问。

## What Changes
- 移除多次订单的24小时访问窗口期限制
- 保持单次订单的24小时访问窗口期（因为单次订单在首次使用后就应该过期）
- 修改订单验证逻辑，区分处理单次和多次订单的时间限制
- 更新相关错误消息和用户提示

## Impact
- **Affected specs**: `specs/verification/spec.md`
- **Affected code**:
  - `src/server/api/verify.js` - 验证API逻辑
  - `src/server/db/operations.js` - 数据库操作函数
  - 相关的错误消息和处理逻辑