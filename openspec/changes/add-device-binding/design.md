## Context
当前系统仅依赖订单号进行验证，任何知道订单号的用户都可以在任何设备上访问内容。这导致安全性问题，特别是在小红书等平台销售虚拟产品时，用户可能会分享订单号给他人。

## Goals / Non-Goals
- Goals:
  - 防止订单号被多设备滥用
  - 在不破坏现有功能的前提下增强安全性
  - 支持合理的设备更换场景
- Non-Goals:
  - 完全防止订单分享（技术上不可能）
  - 实现复杂的设备管理系统
  - 使用需要用户授权的设备信息

## Decisions
- Decision: 使用"双通道ID + 宽容校验"方案
  - 服务器下发UUID到HttpOnly + Secure + SameSite=Lax Cookie（365天有效期）
  - 同步存储同一UUID到localStorage作为备份
  - 优先使用Cookie ID，localStorage作为自我修复机制
- Decision: 采用柔性设备绑定策略
  - 首次验证时绑定设备
  - 允许最多3个设备绑定同一订单（考虑手机/电脑切换）
- Decision: 设备信息存储在SQLite数据库
  - 轻量级，符合项目架构
  - 支持高效查询和更新

## Risks / Trade-offs
- [Risk] Cookie被清除 → localStorage可自我修复同一设备身份
- [Risk] iOS私密浏览限制 → 两者都丢失才被识别为新设备（符合预期）
- [Trade-off] 简单性vs安全性 → 避免侵入式指纹，提升稳定性和隐私友好性
- [Advantage] 不依赖浏览器特征指纹，避免被浏览器/系统干预

## Migration Plan
1. 添加数据库表结构
2. 实现服务器端UUID下发和Cookie设置逻辑
3. 实现前端localStorage同步和自我修复机制
4. 修改验证API集成设备ID检查
5. 更新前端设备ID采集和同步逻辑
6. 测试Cookie/localStorage各种组合场景

## Open Questions
- 是否需要管理员手动解绑设备的功能？