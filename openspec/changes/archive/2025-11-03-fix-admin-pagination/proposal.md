## Why
在管理页面的订单列表中，点击"下一页"按钮时没有更新数据显示。这个问题导致用户无法浏览后续页面的订单数据，影响了管理功能的可用性。

## What Changes
- 修复 `renderPagination` 函数中分页按钮的事件绑定问题
- 优化 `goToPage` 方法的实现，确保正确调用对应的分页加载函数
- 为分页容器添加更好的事件监听器管理，避免重复绑定

## Impact
- Affected specs: admin-management
- Affected code: src/server/web/js/admin.js:576-634 (renderPagination 和 goToPage 方法)
- This is a bug fix that restores the intended pagination behavior