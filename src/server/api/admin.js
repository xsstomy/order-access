const express = require("express");
const path = require("path");
const fs = require("fs").promises;
const multer = require("multer");
const { sessionManager } = require("../middleware/session");
const OrderOperations = require("../db/operations");
const { apiRateLimiter } = require("../middleware/rateLimit");

// 小红书订单编号验证正则表达式（P开头 + 18位数字，共19位）
const ORDER_NUMBER_REGEX = /^P[0-9]{18}$/;

const router = express.Router();
const orderOps = new OrderOperations();

// 管理员密码验证
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123"; // 默认密码，生产环境必须更改

// 密码哈希比较
const verifyPassword = (inputPassword) => {
    // 简单的验证逻辑，生产环境建议使用bcrypt等更安全的方案
    return inputPassword === ADMIN_PASSWORD;
};

// 管理员认证中间件
const requireAdminAuth = (req, res, next) => {
    const sessionId = req.session?.adminSessionId;

    if (!sessionId || !sessionManager.validateAdminSession(sessionId)) {
        return res.status(401).json({
            success: false,
            message: "未授权访问，请先登录",
        });
    }

    const session = sessionManager.getAdminSession(sessionId);
    req.adminSession = session;
    next();
};

// 登录接口
router.post("/login", (req, res) => {
    const { password } = req.body;

    if (!password) {
        return res.json({
            success: false,
            message: "密码不能为空",
        });
    }

    if (verifyPassword(password)) {
        const sessionId = sessionManager.createAdminSession();

        // 设置会话cookie
        req.session.adminSessionId = sessionId;

        return res.json({
            success: true,
            message: "登录成功",
            sessionId: sessionId,
        });
    } else {
        return res.json({
            success: false,
            message: "密码错误",
        });
    }
});

// 登出接口
router.post("/logout", requireAdminAuth, (req, res) => {
    const sessionId = req.session.adminSessionId;
    if (sessionId) {
        sessionManager.removeAdminSession(sessionId);
    }

    req.session.adminSessionId = null;

    return res.json({
        success: true,
        message: "登出成功",
    });
});

// 检查会话状态接口
router.get("/status", (req, res) => {
    const sessionId = req.session?.adminSessionId;
    const authed = !!(
        sessionId && sessionManager.validateAdminSession(sessionId)
    );

    if (!authed) {
        return res.json({
            success: true,
            authenticated: false,
        });
    }

    const session = sessionManager.getAdminSession(sessionId);
    return res.json({
        success: true,
        authenticated: true,
        loginTime: session.createdAt.toISOString(),
        sessionAge: Math.floor(
            (Date.now() - session.createdAt.getTime()) / 60000
        ),
    });
});

// 管理界面访问控制中间件
const adminPageAuth = (req, res, next) => {
    const sessionId = req.session?.adminSessionId;

    if (!sessionId || !sessionManager.validateAdminSession(sessionId)) {
        // 如果是API请求，返回JSON
        if (req.path.startsWith("/api/")) {
            return res.status(401).json({
                success: false,
                message: "未授权访问，请先登录",
            });
        }
        // 如果是页面请求，重定向到登录页面
        return res.redirect("/admin/login");
    }

    next();
};

// ============ 订单管理API端点 ============

// 搜索订单
router.get(
    "/orders/search",
    requireAdminAuth,
    apiRateLimiter,
    async (req, res) => {
        try {
            const { q: query, page = 1, limit = 20 } = req.query;

            if (!query) {
                return res.json({
                    success: false,
                    message: "搜索关键词不能为空",
                });
            }

            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);
            const offset = (pageNum - 1) * limitNum;

            const dbManager = require("../../config/database");

            // 搜索多次订单
            const orders = await dbManager.all(
                `
      SELECT
        order_number,
        created_at,
        max_access,
        (SELECT COUNT(*) FROM order_usage WHERE order_number = mo.order_number) as usage_count
      FROM multi_orders mo
      WHERE order_number LIKE ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `,
                [`%${query}%`, limitNum, offset]
            );

            // 获取总数
            const countResult = await dbManager.get(
                "SELECT COUNT(*) as total FROM multi_orders WHERE order_number LIKE ?",
                [`%${query}%`]
            );
            const { total } = countResult || { total: 0 };

            return res.json({
                success: true,
                orders: orders.map((order) => ({
                    orderNumber: order.order_number,
                    createdAt: order.created_at,
                    maxAccess: order.max_access,
                    usageCount: order.usage_count,
                    remainingAccess:
                        order.max_access === null
                            ? -1
                            : Math.max(0, order.max_access - order.usage_count),
                })),
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    totalPages: Math.ceil(total / limitNum),
                },
                query,
            });
        } catch (error) {
            console.error("搜索订单失败:", error);
            return res.json({
                success: false,
                message: "搜索失败",
            });
        }
    }
);

// 编辑订单最大访问次数
router.put(
    "/orders/:orderNumber",
    requireAdminAuth,
    apiRateLimiter,
    async (req, res) => {
        try {
            const { orderNumber } = req.params;
            const { maxAccess } = req.body;

            if (!orderNumber) {
                return res.json({
                    success: false,
                    message: "订单号不能为空",
                });
            }

            // 验证订单格式（P开头 + 18位数字，共19位）
            if (!ORDER_NUMBER_REGEX.test(orderNumber.trim())) {
                return res.json({
                    success: false,
                    message:
                        "订单格式错误，应为P开头+18位数字（如：P123456789012345678）",
                });
            }

            // 允许 maxAccess 为空字符串、null、undefined，表示无限制
            if (
                maxAccess !== undefined &&
                maxAccess !== null &&
                maxAccess !== ""
            ) {
                const numAccess = Number(maxAccess);
                if (isNaN(numAccess) || numAccess < 1) {
                    return res.json({
                        success: false,
                        message: "最大访问次数必须是大于0的数字",
                    });
                }
            }

            const dbManager = require("../../config/database");
            const result = await dbManager.run(
                "UPDATE multi_orders SET max_access = ? WHERE order_number = ?",
                [maxAccess ? Number(maxAccess) : null, orderNumber.trim()]
            );

            if (result.changes > 0) {
                console.log(
                    `管理员编辑订单: ${orderNumber}, 新的最大访问次数: ${
                        maxAccess || "无限制"
                    }`
                );
                return res.json({
                    success: true,
                    message: "订单更新成功",
                    orderNumber: orderNumber.trim(),
                    maxAccess: maxAccess,
                });
            } else {
                return res.json({
                    success: false,
                    message: "订单不存在",
                });
            }
        } catch (error) {
            console.error("编辑订单失败:", error);
            return res.json({
                success: false,
                message: "编辑失败",
            });
        }
    }
);

// 删除订单
router.delete(
    "/orders/:orderNumber",
    requireAdminAuth,
    apiRateLimiter,
    async (req, res) => {
        try {
            const { orderNumber } = req.params;

            if (!orderNumber) {
                return res.json({
                    success: false,
                    message: "订单号不能为空",
                });
            }

            // 先删除相关的使用记录
            const dbManager = require("../../config/database");

            // 删除使用记录
            await dbManager.run(
                "DELETE FROM order_usage WHERE order_number = ?",
                [orderNumber.trim()]
            );

            // 删除多次订单记录
            const result = await dbManager.run(
                "DELETE FROM multi_orders WHERE order_number = ?",
                [orderNumber.trim()]
            );

            if (result.changes > 0) {
                console.log(`管理员删除订单: ${orderNumber}`);
                return res.json({
                    success: true,
                    message: "订单删除成功",
                });
            } else {
                return res.json({
                    success: false,
                    message: "订单不存在",
                });
            }
        } catch (error) {
            console.error("删除订单失败:", error);
            return res.json({
                success: false,
                message: "删除失败",
            });
        }
    }
);

// 获取订单列表
router.get(
    "/orders/list",
    requireAdminAuth,
    apiRateLimiter,
    async (req, res) => {
        try {
            const { page = 1, limit = 20 } = req.query;

            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);
            const offset = (pageNum - 1) * limitNum;

            const dbManager = require("../../config/database");

            // 获取多次订单列表
            const orders = await dbManager.all(
                `
      SELECT
        order_number,
        created_at,
        max_access,
        (SELECT COUNT(*) FROM order_usage WHERE order_number = mo.order_number) as usage_count
      FROM multi_orders mo
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `,
                [limitNum, offset]
            );

            console.log("DEBUG: orders query result:", orders);

            // 获取总数
            const countResult = await dbManager.get(
                "SELECT COUNT(*) as total FROM multi_orders"
            );
            console.log("DEBUG: count query result:", countResult);
            const { total } = countResult;

            return res.json({
                success: true,
                orders:
                    orders && orders.length > 0
                        ? orders.map((order) => ({
                              orderNumber: order.order_number,
                              createdAt: order.created_at,
                              maxAccess: order.max_access,
                              usageCount: order.usage_count,
                              remainingAccess:
                                  order.max_access === null
                                      ? -1
                                      : Math.max(
                                            0,
                                            order.max_access - order.usage_count
                                        ),
                          }))
                        : [],
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total: total || 0,
                    totalPages: total ? Math.ceil(total / limitNum) : 0,
                },
            });
        } catch (error) {
            console.error("获取订单列表失败:", error);
            return res.json({
                success: false,
                message: "获取订单列表失败",
            });
        }
    }
);

// 获取订单详情（包括使用历史）
router.get(
    "/orders/:orderNumber/details",
    requireAdminAuth,
    apiRateLimiter,
    async (req, res) => {
        try {
            const { orderNumber } = req.params;

            if (!orderNumber) {
                return res.json({
                    success: false,
                    message: "订单号不能为空",
                });
            }

            // 获取订单使用情况
            const usageInfo = await orderOps.getOrderUsage(orderNumber.trim());

            if (!usageInfo.isMultiOrder) {
                return res.json({
                    success: false,
                    message: "订单不在多次订单白名单中",
                });
            }

            // 计算剩余访问次数
            const remainingAccess =
                await orderOps.checkMultiOrderRemainingAccess(
                    orderNumber.trim()
                );

            return res.json({
                success: true,
                orderNumber: orderNumber.trim(),
                isMultiOrder: true,
                maxAccess: usageInfo.multiOrderInfo.max_access,
                usageCount: usageInfo.usageCount,
                remainingAccess:
                    remainingAccess === Infinity ? -1 : remainingAccess,
                createdAt: usageInfo.multiOrderInfo.created_at,
                lastUsage:
                    usageInfo.usageRecords.length > 0
                        ? usageInfo.usageRecords[0].accessed_at
                        : null,
                usageHistory: usageInfo.usageRecords.map((record) => ({
                    accessedAt: record.accessed_at,
                    ipAddress: record.ip_address,
                    userAgent: record.user_agent || "未知",
                    sessionId: record.session_id,
                })),
            });
        } catch (error) {
            console.error("查询订单详情失败:", error);
            return res.json({
                success: false,
                message: "查询失败",
            });
        }
    }
);

// 添加单个订单（管理员专用）
router.post(
    "/orders/add",
    requireAdminAuth,
    apiRateLimiter,
    async (req, res) => {
        try {
            const { orderNumber, maxAccess } = req.body;

            if (!orderNumber || typeof orderNumber !== "string") {
                return res.json({
                    success: false,
                    message: "订单号不能为空且必须是字符串",
                });
            }

            // 验证订单格式（P开头 + 18位数字，共19位）
            if (!ORDER_NUMBER_REGEX.test(orderNumber.trim())) {
                return res.json({
                    success: false,
                    message:
                        "订单格式错误，应为P开头+18位数字（如：P123456789012345678）",
                });
            }

            // 允许 maxAccess 为空字符串、null、undefined，表示无限制
            if (
                maxAccess !== undefined &&
                maxAccess !== null &&
                maxAccess !== ""
            ) {
                const numAccess = Number(maxAccess);
                if (isNaN(numAccess) || numAccess < 1) {
                    return res.json({
                        success: false,
                        message: "最大访问次数必须是大于0的数字",
                    });
                }
            }

            const result = await orderOps.addMultiOrder(
                orderNumber.trim(),
                maxAccess ? Number(maxAccess) : null
            );

            if (result.changes > 0) {
                console.log(
                    `管理员添加订单: ${orderNumber}, 最大访问次数: ${
                        maxAccess || "无限制"
                    }`
                );
                return res.json({
                    success: true,
                    message: "订单添加成功",
                    orderNumber: orderNumber.trim(),
                    maxAccess: maxAccess || null,
                });
            } else {
                return res.json({
                    success: false,
                    message: "订单已存在",
                });
            }
        } catch (error) {
            console.error("添加订单失败:", error);
            return res.json({
                success: false,
                message: "添加失败",
            });
        }
    }
);

// 批量添加订单（管理员专用）
router.post(
    "/orders/batch-add",
    requireAdminAuth,
    apiRateLimiter,
    async (req, res) => {
        try {
            const { orders } = req.body;

            if (!Array.isArray(orders) || orders.length === 0) {
                return res.json({
                    success: false,
                    message: "订单列表不能为空且必须是数组",
                });
            }

            const validOrders = [];
            const invalidOrders = [];

            for (const order of orders) {
                if (
                    order.orderNumber &&
                    typeof order.orderNumber === "string"
                ) {
                    // 验证订单格式（P开头 + 18位数字，共19位）
                    if (!ORDER_NUMBER_REGEX.test(order.orderNumber.trim())) {
                        invalidOrders.push(order.orderNumber);
                        continue;
                    }
                    // 允许 maxAccess 为空字符串、null、undefined，表示无限制
                    let processedMaxAccess = null;
                    if (
                        order.maxAccess !== undefined &&
                        order.maxAccess !== null &&
                        order.maxAccess !== ""
                    ) {
                        const numAccess = Number(order.maxAccess);
                        if (isNaN(numAccess) || numAccess < 1) {
                            // 跳过无效的访问次数，但仍然处理其他订单
                            continue;
                        }
                        processedMaxAccess = numAccess;
                    }

                    validOrders.push({
                        orderNumber: order.orderNumber.trim(),
                        maxAccess: processedMaxAccess,
                    });
                }
            }

            if (validOrders.length === 0) {
                return res.json({
                    success: false,
                    message: `没有有效的订单数据。以下订单格式错误：${invalidOrders.join(
                        ", "
                    )}，订单应为P开头+18位数字`,
                    invalidOrders,
                });
            }

            const insertedCount = await orderOps.addMultipleMultiOrders(
                validOrders
            );

            console.log(
                `管理员批量添加订单: ${insertedCount}/${validOrders.length} 个订单成功添加`
            );

            let responseMessage = `批量添加完成，成功添加 ${insertedCount} 个订单`;
            if (invalidOrders.length > 0) {
                responseMessage += `，${invalidOrders.length} 个订单因格式错误被跳过`;
            }

            return res.json({
                success: true,
                message: responseMessage,
                total: validOrders.length,
                inserted: insertedCount,
                failed: validOrders.length - insertedCount,
                invalidOrders:
                    invalidOrders.length > 0 ? invalidOrders : undefined,
            });
        } catch (error) {
            console.error("批量添加订单失败:", error);
            return res.json({
                success: false,
                message: "批量添加失败",
            });
        }
    }
);

// ============ 订单验证记录查询功能 ============

// 获取订单验证记录统计
router.get(
    "/verification-stats",
    requireAdminAuth,
    apiRateLimiter,
    async (req, res) => {
        console.log("🔍 验证记录统计API被调用");
        console.log("📥 请求查询参数:", req.query);

        // 强化缓存控制，确保数据新鲜度
        res.set("Cache-Control", "no-cache, no-store, must-revalidate, private, max-age=0");
        res.setHeader("ETag", ""); // 禁用ETag
        res.setHeader("Pragma", "no-cache"); // HTTP/1.0 兼容
        res.setHeader("Expires", "0"); // 立即过期

        // 添加数据新鲜度时间戳
        const queryStartTime = new Date().toISOString();
        console.log("🕐 查询开始时间:", queryStartTime);

        try {
            const {
                page = 1,
                limit = 20,
                sortBy = "usageCount",
                sortOrder = "desc",
                orderNumber,
                dateFrom,
                dateTo,
            } = req.query;

            console.log("📊 解析后的参数:", {
                page,
                limit,
                sortBy,
                sortOrder,
                orderNumber,
                dateFrom,
                dateTo,
            });

            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);
            const offset = (pageNum - 1) * limitNum;

            console.log("📈 分页计算:", { pageNum, limitNum, offset });

            const dbManager = require("../../config/database");
            console.log("🗄️ 数据库管理器已加载");

            // 构建WHERE条件
            let whereConditions = [];
            let params = [];

            if (orderNumber) {
                console.log("🔍 添加订单号筛选:", orderNumber);
                whereConditions.push("ou.order_number LIKE ?");
                params.push(`%${orderNumber}%`);
            }

            if (dateFrom) {
                console.log("🔍 添加开始日期筛选:", dateFrom);
                // 验证日期范围不超过1年
                const fromDate = new Date(dateFrom);
                const maxDateFrom = new Date();
                maxDateFrom.setFullYear(maxDateFrom.getFullYear() - 1);

                if (fromDate < maxDateFrom) {
                    console.log("❌ 日期范围超过1年限制:", dateFrom);
                    return res.json({
                        success: false,
                        message: "开始日期不能超过1年前",
                    });
                }

                whereConditions.push("ou.accessed_at >= ?");
                params.push(dateFrom);
            }

            if (dateTo) {
                console.log("🔍 添加结束日期筛选:", dateTo);
                // 修复：将结束日期扩展到当天的23:59:59，确保包含当天的所有记录
                const endDateTime = dateTo + " 23:59:59";
                whereConditions.push("ou.accessed_at <= ?");
                params.push(endDateTime);
                console.log("🔧 修复后的结束时间:", endDateTime);
            }

            const whereClause =
                whereConditions.length > 0
                    ? `WHERE ${whereConditions.join(" AND ")}`
                    : "";
            console.log("📝 WHERE子句:", whereClause);
            console.log("📝 查询参数:", params);

            // 构建排序条件
            const validSortBy = [
                "usageCount",
                "firstAccess",
                "lastAccess",
                "orderNumber",
            ];
            const validSortOrder = ["asc", "desc"];
            const finalSortBy = validSortBy.includes(sortBy)
                ? sortBy
                : "usageCount";
            const finalSortOrder = validSortOrder.includes(sortOrder)
                ? sortOrder
                : "desc";

            console.log("🏷️ 排序参数:", { finalSortBy, finalSortOrder });

            let orderClause;
            switch (finalSortBy) {
                case "usageCount":
                    orderClause = `ORDER BY COUNT(*) ${finalSortOrder.toUpperCase()}`;
                    break;
                case "firstAccess":
                    orderClause = `ORDER BY MIN(ou.accessed_at) ${finalSortOrder.toUpperCase()}`;
                    break;
                case "lastAccess":
                    orderClause = `ORDER BY MAX(ou.accessed_at) ${finalSortOrder.toUpperCase()}`;
                    break;
                case "orderNumber":
                    orderClause = `ORDER BY ou.order_number ${finalSortOrder.toUpperCase()}`;
                    break;
                default:
                    orderClause = "ORDER BY COUNT(*) DESC";
            }

            console.log("📊 ORDER BY子句:", orderClause);

            // 查询验证记录统计
            console.log("🔍 开始执行统计查询...");
            const stats = await dbManager.all(
                `
      SELECT
        ou.order_number,
        COUNT(*) as usage_count,
        MIN(ou.accessed_at) as first_access,
        MAX(ou.accessed_at) as last_access,
        mo.created_at as order_created_at,
        mo.max_access
      FROM order_usage ou
      LEFT JOIN multi_orders mo ON ou.order_number = mo.order_number
      ${whereClause}
      GROUP BY ou.order_number
      ${orderClause}
      LIMIT ? OFFSET ?
    `,
                [...params, limitNum, offset]
            );

            console.log("📈 统计查询结果:", {
                记录数量: stats.length,
                前几条数据: stats.slice(0, 3),
            });

            // 获取总数
            console.log("🔢 开始执行总数查询...");
            const totalResult = await dbManager.get(
                `
      SELECT COUNT(DISTINCT ou.order_number) as total
      FROM order_usage ou
      LEFT JOIN multi_orders mo ON ou.order_number = mo.order_number
      ${whereClause}
    `,
                params
            );

            const { total } = totalResult || { total: 0 };
            console.log("🔢 总数查询结果:", total);

            console.log("🎯 准备返回响应数据...");

            // 计算查询完成时间
            const queryEndTime = new Date().toISOString();
            const queryDuration = new Date(queryEndTime) - new Date(queryStartTime);

            const responseData = {
                success: true,
                // 添加数据新鲜度信息
                dataFreshness: {
                    queryStartTime: queryStartTime,
                    queryEndTime: queryEndTime,
                    queryDurationMs: queryDuration,
                    message: "实时数据，每次请求均从数据库获取最新记录"
                },
                stats: stats.map((stat) => ({
                    orderNumber: stat.order_number,
                    usageCount: stat.usage_count,
                    firstAccess: stat.first_access,
                    lastAccess: stat.last_access,
                    orderCreatedAt: stat.order_created_at,
                    maxAccess: stat.max_access,
                    remainingAccess:
                        stat.max_access === null
                            ? -1
                            : Math.max(0, stat.max_access - stat.usage_count),
                })),
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    totalPages: Math.ceil(total / limitNum),
                },
                filters: {
                    orderNumber: orderNumber || "",
                    dateFrom: dateFrom || "",
                    dateTo: dateTo || "",
                    sortBy: finalSortBy,
                    sortOrder: finalSortOrder,
                },
            };

            console.log("✅ 响应数据准备完成:", {
                success: responseData.success,
                stats数量: responseData.stats.length,
                pagination: responseData.pagination,
                filters: responseData.filters,
                dataFreshness: responseData.dataFreshness,
            });

            // 添加最终响应时间戳
            res.set('X-Response-Time', queryEndTime);
            res.set('X-Query-Duration', `${queryDuration}ms`);

            return res.json(responseData);
        } catch (error) {
            console.error("获取验证记录统计失败:", error);

            // 确保错误响应也包含缓存控制头
            res.set("Cache-Control", "no-cache, no-store, must-revalidate, private, max-age=0");
            res.setHeader("ETag", "");
            res.setHeader("Pragma", "no-cache");
            res.setHeader("Expires", "0");

            return res.json({
                success: false,
                message: "获取验证记录统计失败",
                error: {
                    timestamp: new Date().toISOString(),
                    details: error.message
                }
            });
        }
    }
);

// 获取订单的详细验证记录
router.get(
    "/verification-records/:orderNumber",
    requireAdminAuth,
    apiRateLimiter,
    async (req, res) => {
        try {
            const { orderNumber } = req.params;
            const { page = 1, limit = 50 } = req.query;

            if (!orderNumber) {
                return res.json({
                    success: false,
                    message: "订单号不能为空",
                });
            }

            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);
            const offset = (pageNum - 1) * limitNum;

            const dbManager = require("../../config/database");

            // 查询验证记录
            const records = await dbManager.all(
                `
      SELECT
        id,
        ip_address,
        user_agent,
        device_id,
        session_id,
        accessed_at
      FROM order_usage
      WHERE order_number = ?
      ORDER BY accessed_at DESC
      LIMIT ? OFFSET ?
    `,
                [orderNumber.trim(), limitNum, offset]
            );

            // 获取总数
            const countResult = await dbManager.get(
                "SELECT COUNT(*) as total FROM order_usage WHERE order_number = ?",
                [orderNumber.trim()]
            );
            const { total } = countResult || { total: 0 };

            // 获取订单基本信息
            const orderInfo = await dbManager.get(
                `
      SELECT
        mo.created_at as order_created_at,
        mo.max_access
      FROM multi_orders mo
      WHERE mo.order_number = ?
    `,
                [orderNumber.trim()]
            );

            return res.json({
                success: true,
                orderNumber: orderNumber.trim(),
                orderInfo: orderInfo
                    ? {
                          createdAt: orderInfo.order_created_at,
                          maxAccess: orderInfo.max_access,
                      }
                    : null,
                records: records.map((record) => ({
                    id: record.id,
                    ipAddress: record.ip_address,
                    userAgent: record.user_agent || "未知",
                    deviceId: record.device_id,
                    sessionId: record.session_id,
                    accessedAt: record.accessed_at,
                })),
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    totalPages: Math.ceil(total / limitNum),
                },
            });
        } catch (error) {
            console.error("获取验证记录详情失败:", error);
            return res.json({
                success: false,
                message: "获取验证记录详情失败",
            });
        }
    }
);

// ============ 文本文件导入功能 ============

// 配置 multer 用于文件上传
const upload = multer({
    dest: "uploads/", // 临时上传目录
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB 限制
    },
    fileFilter: (req, file, cb) => {
        // 只允许文本文件
        if (
            file.mimetype === "text/plain" ||
            file.originalname.endsWith(".txt")
        ) {
            cb(null, true);
        } else {
            cb(new Error("只支持 .txt 文本文件"));
        }
    },
});

// 文本文件导入订单
router.post(
    "/orders/import-text",
    requireAdminAuth,
    apiRateLimiter,
    upload.single("file"),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.json({
                    success: false,
                    message: "请选择要上传的文本文件",
                });
            }

            const { maxAccess } = req.body;
            const filePath = req.file.path;

            // 读取文件内容
            const fileContent = await fs.readFile(filePath, "utf8");

            // 清理临时文件
            await fs.unlink(filePath);

            // 按行分割并过滤空行
            const lines = fileContent
                .split("\n")
                .map((line) => line.trim())
                .filter((line) => line.length > 0);

            if (lines.length === 0) {
                return res.json({
                    success: false,
                    message: "文件内容为空，请检查文件格式",
                });
            }

            const validOrders = [];
            const invalidOrders = [];
            const duplicateOrders = [];

            // 验证每个订单号
            for (let i = 0; i < lines.length; i++) {
                const orderNumber = lines[i];

                // 验证订单格式（P开头 + 18位数字，共19位）
                if (!ORDER_NUMBER_REGEX.test(orderNumber)) {
                    invalidOrders.push({
                        lineNumber: i + 1,
                        orderNumber: orderNumber,
                        reason: "格式错误，应为P开头+18位数字",
                    });
                    continue;
                }

                validOrders.push({
                    orderNumber: orderNumber.trim(),
                    maxAccess: maxAccess ? Number(maxAccess) : null,
                });
            }

            if (validOrders.length === 0) {
                return res.json({
                    success: false,
                    message: "没有找到有效的订单号",
                    totalLines: lines.length,
                    invalidOrders: invalidOrders,
                });
            }

            // 批量插入订单
            const insertedCount = await orderOps.addMultipleMultiOrders(
                validOrders
            );

            // 检查重复订单（插入数量小于有效订单数量可能表示有重复）
            const duplicateCount = validOrders.length - insertedCount;
            if (duplicateCount > 0) {
                // 注意：由于使用了 INSERT OR IGNORE，我们无法直接知道哪些是重复的
                // 这里只提供数量统计
            }

            console.log(
                `管理员文本文件导入: ${insertedCount}/${validOrders.length} 个订单成功导入，文件: ${req.file.originalname}`
            );

            let responseMessage = `成功导入 ${insertedCount} 个订单号`;
            if (duplicateCount > 0) {
                responseMessage += `，跳过 ${duplicateCount} 个重复订单`;
            }
            if (invalidOrders.length > 0) {
                responseMessage += `，${invalidOrders.length} 个订单因格式错误被跳过`;
            }

            return res.json({
                success: true,
                message: responseMessage,
                statistics: {
                    totalLines: lines.length,
                    validOrders: validOrders.length,
                    inserted: insertedCount,
                    duplicates: duplicateCount,
                    invalid: invalidOrders.length,
                },
                invalidOrders:
                    invalidOrders.length > 0 ? invalidOrders : undefined,
            });
        } catch (error) {
            // 清理临时文件（如果存在）
            if (req.file && req.file.path) {
                try {
                    await fs.unlink(req.file.path);
                } catch (cleanupError) {
                    console.error("清理临时文件失败:", cleanupError);
                }
            }

            console.error("文本文件导入失败:", error);
            if (error.code === "LIMIT_FILE_SIZE") {
                return res.json({
                    success: false,
                    message: "文件大小超过限制（最大10MB）",
                });
            }

            return res.json({
                success: false,
                message: "文件导入失败: " + error.message,
            });
        }
    }
);

module.exports = {
    router,
    requireAdminAuth,
    adminPageAuth,
};
