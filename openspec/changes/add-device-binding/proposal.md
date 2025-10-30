## Why
用户可以随意填写订单号进行验证，缺乏有效的设备绑定机制来防止滥用。需要通过设备唯一标识符来增强验证安全性，确保订单只能从特定设备访问。

## What Changes
- 添加设备指纹识别功能，生成唯一设备ID
- 修改验证流程，将订单与设备ID绑定
- 增强数据库结构，存储设备绑定信息
- 添加设备管理的API接口
- 更新前端逻辑，支持设备指纹采集

## Impact
- Affected specs: verification (新增设备验证能力)
- Affected code: src/server/api/verify.js, src/public/js/app.js, src/server/db/operations.js
- Database: 新增device_bindings表，修改order_usage表