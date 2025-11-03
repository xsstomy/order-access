# Fix Admin Navigation Width Consistency

## Why
The admin navigation tabs currently appear to change width when switching between "添加订单", "订单列表", and "搜索订单" due to the navigation container not having a fixed width. This creates a poor user experience with inconsistent layout behavior.

## What Changes
- Modify the `.admin-nav` CSS to use a fixed width container
- Ensure navigation buttons maintain consistent width regardless of active tab content
- Preserve the existing Apple-style design and responsive behavior
- **BREAKING**: None - this is a visual fix only

## Impact
- Affected specs: None (UI consistency improvement)
- Affected code: `src/server/web/css/admin.css:369-406` (admin navigation styles)
- User experience: Improved visual consistency when switching between tabs