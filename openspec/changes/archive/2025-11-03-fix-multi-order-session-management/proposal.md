## Why
修复 multi-order.html 页面会话管理功能缺失的问题，确保用户验证订单后能够保持2小时的会话状态，刷新页面后无需重新验证。

## What Changes
- 修复 multi-order-verification.js 中的会话状态检查和恢复逻辑
- 确保 UI 状态管理器正确更新会话状态显示
- 修复会话计时器功能
- 保证页面刷新后会话状态持久化

## Impact
- Affected specs: session-management, multi-order-verification
- Affected code: /public/js/multi-order-verification.js:261-290, /public/js/multi-order-verification.js:374-376