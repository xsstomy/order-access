require("dotenv").config();

const serverConfig = {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || "development",

    // 会话配置
    session: {
        secret: process.env.SESSION_SECRET || "change-this-secret-key",
        maxAge: parseInt(process.env.SESSION_MAX_AGE) || 7200000, // 2小时
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
    },

    // CORS配置 - 增强配置支持前后端分离
    cors: {
        origin: function (origin, callback) {
            // 开发环境检测（包含 development 等变体）
            if (process.env.NODE_ENV?.includes("development")) {
                return callback(null, true);
            }

            // 生产环境只允许配置的 FRONTEND_URL
            const allowedOrigins = [
                process.env.FRONTEND_URL,
                "http://localhost:3000",
            ].filter(Boolean);

            console.log(
                `CORS检查 - 请求来源: ${origin}, 允许的来源: ${allowedOrigins.join(
                    ", "
                )}`
            );

            // 生产环境检查白名单
            if (!origin || allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            console.log(`CORS拒绝 - 来源 ${origin} 不在允许列表中`);
            // callback(
            //     new Error(
            //         `Not allowed by CORS. Origin ${origin} is not in the allowed list: ${allowedOrigins.join(
            //             ", "
            //         )}`
            //     )
            // );
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: [
            "Content-Type",
            "Authorization",
            "X-Session-ID",
            "X-Internal-API-Key",
        ],
        exposedHeaders: ["X-Total-Count"],
    },

    // 代理配置
    trustProxy: process.env.TRUST_PROXY === "true",

    // 安全头配置
    helmet: {
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: ["'self'", "https://s.immersivetranslate.com"],
            },
        },
    },
};

module.exports = serverConfig;
