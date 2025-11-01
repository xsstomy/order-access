const express = require("express");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const cookieSession = require("cookie-session");
require("dotenv").config();

const serverConfig = require("../config/server");
const { initializeDatabase } = require("./db/init");

// 导入中间件
const { rateLimiter } = require("./middleware/rateLimit");

// 导入 API 路由
const verifyAPI = require("./api/verify");
const multiAPI = require("./api/multi");
const deviceAPI = require("./api/device");
const tutorialAPI = require("./api/tutorial");
const sessionAPI = require("./api/session");
const { router: adminAPI, adminPageAuth } = require("./api/admin");

class OrderAccessServer {
    constructor() {
        this.app = express();
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
    }

    setupMiddleware() {
        // 代理配置
        if (serverConfig.trustProxy) {
            this.app.set("trust proxy", 1);
        }

        // 安全中间件
        this.app.use(helmet(serverConfig.helmet));

        // CORS配置
        this.app.use(cors(serverConfig.cors));

        // 限流中间件
        this.app.use(rateLimiter);

        // Cookie解析（设备ID管理需要）
        this.app.use(cookieParser());

        // 会话管理
        this.app.use(cookieSession(serverConfig.session));

        // 请求体解析
        this.app.use(express.json({ limit: "10kb" }));
        this.app.use(express.urlencoded({ extended: true, limit: "10kb" }));
    }

    setupRoutes() {
        // API 路由
        this.app.use("/api/verify", verifyAPI);
        this.app.use("/api/multi", multiAPI);
        this.app.use("/api/device", deviceAPI);
        this.app.use("/api/tutorial", tutorialAPI);
        this.app.use("/api/session", sessionAPI);
        this.app.use("/api/admin", adminAPI);

        // 静态资源路由 - CSS和JS文件
        this.app.use("/css", express.static(path.join(__dirname, "web/css")));
        this.app.use("/js", express.static(path.join(__dirname, "web/js")));

        // 管理界面路由 - 登录页面不需要认证
        this.app.get("/admin/login", (req, res) => {
            res.sendFile(path.join(__dirname, "web/admin.html"));
        });

        // 其他管理页面需要认证
        this.app.use(
            "/admin",
            adminPageAuth,
            express.static(path.join(__dirname, "web"))
        );
        this.app.get("/admin", adminPageAuth, (req, res) => {
            res.sendFile(path.join(__dirname, "web/admin.html"));
        });

        // 前后端分离 - 移除主页路由，主页由前端服务提供

        // 健康检查端点 - 增强版本提供系统信息
        this.app.get("/health", (req, res) => {
            const dbManager = require("../config/database");
            const sessionManager =
                require("./middleware/session").sessionManager;

            // 获取系统统计信息
            const systemInfo = {
                status: "ok",
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                version: process.env.npm_package_version || "1.0.0",
                environment: serverConfig.nodeEnv,
                // 会话统计
                sessions: {
                    active: sessionManager.getActiveSessionCount(),
                    maxAge: serverConfig.session.maxAge,
                },
                // 数据库状态
                database: {
                    status: "connected",
                    path: process.env.DB_PATH || "database/orders.db",
                },
                // API统计
                api: {
                    endpoints: [
                        "POST /api/verify",
                        "GET /api/verify/status",
                        "POST /api/verify/refresh",
                        "POST /api/verify/logout",
                        "GET /api/tutorial/content",
                        "GET /api/tutorial/overview",
                        "GET /api/session/status",
                        "POST /api/session/extend",
                        "POST /api/multi/add",
                        "GET /api/multi/list",
                        "POST /api/device/set",
                        "GET /api/device/current",
                    ],
                },
            };

            res.json(systemInfo);
        });

        // API 404处理 - 前后端分离版本
        this.app.use("/api/*", (req, res) => {
            res.status(404).json({
                success: false,
                message: "API接口不存在",
                path: req.path,
                method: req.method,
            });
        });

        // 根路径重定向到API信息（用于测试）
        this.app.get("/", (req, res) => {
            res.json({
                message: "Order Access API Server - 前后端分离版本",
                version: "1.0.0",
                endpoints: {
                    health: "/health",
                    verification: "/api/verify",
                    tutorial: "/api/tutorial",
                    session: "/api/session",
                    multi: "/api/multi",
                    device: "/api/device",
                },
                documentation: "请查看API文档了解详细使用方法",
            });
        });
    }

    setupErrorHandling() {
        // 全局错误处理中间件
        this.app.use((err, req, res, next) => {
            console.error("服务器错误:", err);

            // 不暴露详细错误信息给客户端
            res.status(500).json({
                success: false,
                message: "服务器内部错误，请稍后再试或联系客服",
            });
        });

        // 处理未捕获的Promise拒绝
        process.on("unhandledRejection", (reason, promise) => {
            console.error("未处理的Promise拒绝:", reason);
        });

        // 处理未捕获的异常
        process.on("uncaughtException", (err) => {
            console.error("未捕获的异常:", err);
            process.exit(1);
        });
    }

    // 启动服务器
    start() {
        try {
            // 初始化数据库
            initializeDatabase();

            const server = this.app.listen(serverConfig.port, () => {
                console.log(`\n🚀 Order Access Server 启动成功!`);
                console.log(
                    `📍 服务地址: http://localhost:${serverConfig.port}`
                );
                console.log(`🌍 环境: ${serverConfig.nodeEnv}`);
                console.log(
                    `⏰ 启动时间: ${new Date().toLocaleString("zh-CN")}\n`
                );
            });

            // 优雅关闭
            process.on("SIGTERM", () => {
                console.log("收到 SIGTERM 信号，正在关闭服务器...");
                server.close(() => {
                    console.log("服务器已关闭");
                    process.exit(0);
                });
            });

            process.on("SIGINT", () => {
                console.log("\n收到 SIGINT 信号，正在关闭服务器...");
                server.close(() => {
                    console.log("服务器已关闭");
                    process.exit(0);
                });
            });

            return server;
        } catch (error) {
            console.error("启动服务器失败:", error.message);
            process.exit(1);
        }
    }
}

// 如果直接运行此文件，则启动服务器
if (require.main === module) {
    const server = new OrderAccessServer();
    server.start();
}

module.exports = OrderAccessServer;
