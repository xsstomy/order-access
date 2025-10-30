# order-access

> 基于订单号的网页访问控制系统
> 用于限制虚拟产品教程（如小红书自动发货场景）的查看次数

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![Database: SQLite](https://img.shields.io/badge/database-SQLite-blue.svg)](https://sqlite.org/)

---

## 🧭 项目简介

**order-access** 是一个轻量级的内容访问验证系统，用户通过输入订单编号来验证访问权限。
系统区分两类订单：

- **单次订单**：仅允许首次访问；
- **多次订单**：允许不限次数访问（或自定义上限）。

适用于小红书、微信、独立站等数字内容销售场景。

---

## ✨ 功能特性

- ✅ **基于订单号验证**：支持单次与多次访问逻辑  
- 🔒 **不暴露订单状态**：统一失败文案防爆破  
- 🔁 **2 小时会话保持**：用户验证后可顺畅阅读  
- ⚙️ **SQLite 存储**：轻量、免安装、易迁移  
- 🚀 **Express 后端**：部署在任意 VPS / Node 环境  
- 🧱 **可选白名单机制**：仅需维护“多次订单”  
- 🧰 **CLI 管理工具**：可手动或批量导入白名单  
- 🕵️ **限流与格式校验**：基础防刷防爆破机制  

---

## 🏗️ 系统架构

Client (Tutorial Page)
↓ 输入订单号
Express Server (VPS)
├─ /api/verify # 验证接口（原子扣次）
├─ /api/multi/add # 添加多次白名单（CLI/私有）
└─ SQLite Database
├─ multi_orders # 多次订单白名单
└─ order_usage # 访问计数表

yaml
复制代码

---

## 📘 项目目录结构（规划）

openspec/ # 项目规范与提案文档
src/
├─ server/ # Express 后端
│ ├─ api/verify.js
│ ├─ db.js
│ ├─ rateLimit.js
│ └─ cli.js
├─ public/ # 静态前端（输入订单号页面）
└─ config/ # 配置文件

yaml
复制代码

---

## 🧩 技术栈

- Node.js (Express)
- SQLite (better-sqlite3)
- Rate limit (express-rate-limit)
- Cookie-session / JWT (2h 会话保持)
- Caddy / Nginx（反向代理）
- OpenSpec（需求与迭代规范）

---

## 🚀 快速启动（开发版）

```bash
# 1. 克隆仓库
git clone https://github.com/yourname/order-access.git
cd order-access

# 2. 安装依赖
npm install

# 3. 初始化数据库
npm run init-db

# 4. 启动服务
npm run dev
打开浏览器访问：
👉 http://localhost:3000

🔑 CLI 命令（管理多次订单）
bash
复制代码
# 添加多次订单（不限次）
node cli.js add ORDER123

# 批量导入 CSV
node cli.js import multi_orders.csv

# 查询订单使用情况
node cli.js query ORDER123
📜 OpenSpec 结构
规范与提案文档在 openspec/ 文件夹中：

pgsql
复制代码
openspec/
├─ project.md
├─ specs/
│  └─ order-access-control.md
├─ proposals/
│  └─ enable-webhook-fallback.md
├─ decisions/
│  └─ adr-0001-session-2h.md
└─ tasks/
   └─ milestone-mvp.md
使用 openspec validate 可校验需求规范；
使用 openspec proposal create 创建新提案。

🔐 安全策略
所有失败提示统一文案：验证失败，请稍后再试或联系客服

单 IP/UA 限流：60 次/分钟

验证逻辑原子更新，防并发超放

Cookie 会话过期时间：2 小时

订单号格式严格校验

🧱 部署建议
Node 18+ / PM2 运行

SQLite 数据每日备份

HTTPS 反向代理（Nginx/Caddy）

后台 CLI 工具管理白名单

开放端口：80/443

🗺️ 未来规划
模块	目标
Webhook 集成	支持小红书订单实时同步
审计日志	记录访问历史，便于风控
黑名单系统	对爆破 IP/UA 进行封禁
Cloudflare 迁移	D1 数据库无服务部署

🧑‍💻 作者
@yourname
一个独立开发者，为数字产品卖家构建安全访问解决方案。

🪪 License
MIT License © 2025 yourname

🧠 相关理念：
简单可部署、清晰可维护、适合独立开发者的数字内容保护系统。

yaml
复制代码

---

## 三、总结

✅ **推荐仓库名**：`order-access`  
✅ **README 内容**：上面这份模板完整覆盖你的现阶段需求与后续计划。

---

是否希望我帮你再生成一份 **GitHub 仓库初始化脚本**（自动创建 openspec 文件结构 + README + package.json + 初始 server 目录）？  
这样你直接一键 `npx` 运行就能初始化整个项目骨架。