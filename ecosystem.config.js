module.exports = {
    apps: [
        {
            name: "order-access",
            script: "src/server/app.js",
            instances: 1,
            autorestart: true,
            watch: false,
            env: {
                NODE_ENV: "production",
                PORT: 3000, // 或者你在 .env 中定义的端口
            },
            error_file: "/www/data/order-access/logs/err.log",
            out_file: "/www/data/order-access/logs/out.log",
            merge_logs: true,
            max_memory_restart: "300M",
        },
    ],
};
