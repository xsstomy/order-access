// 管理界面JavaScript
// 小红书订单编号验证正则表达式（P开头 + 18位数字，共19位）
const ORDER_NUMBER_REGEX = /^P[0-9]{18}$/;

class AdminInterface {
    constructor() {
        this.currentPage = 1;
        this.currentSearchPage = 1;
        this.currentSearchQuery = "";
        this.currentVerificationPage = 1;
        // 设置默认30天时间范围
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);

        this.currentVerificationFilters = {
            orderNumber: "",
            dateFrom: thirtyDaysAgo.toISOString().split("T")[0], // 30天前
            dateTo: today.toISOString().split("T")[0], // 今天
            sortBy: "usageCount",
            sortOrder: "desc",
        };
        this.currentVerificationDetailsPage = 1;
        this.currentVerificationDetailsOrder = "";
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkAuthStatus();
    }

    bindEvents() {
        this.setupNavbarBurger();

        // 登录表单
        document.getElementById("loginForm").addEventListener("submit", (e) => {
            e.preventDefault();
            this.login();
        });

        // 登出按钮
        document.getElementById("logoutBtn").addEventListener("click", () => {
            this.logout();
        });

        // 标签页切换
        document.querySelectorAll(".tabs li").forEach((li) => {
            li.addEventListener("click", (e) => {
                const tabName = li.dataset.tab;
                if (tabName) {
                    this.switchTab(tabName);
                }
            });
        });

        // 单个添加表单
        document
            .getElementById("singleAddForm")
            .addEventListener("submit", (e) => {
                e.preventDefault();
                this.addSingleOrder();
            });

        // 批量添加表单
        document
            .getElementById("batchAddForm")
            .addEventListener("submit", (e) => {
                e.preventDefault();
                this.addBatchOrders();
            });

        // 刷新列表按钮
        document
            .getElementById("refreshListBtn")
            .addEventListener("click", () => {
                this.loadOrderList();
            });

        // 搜索表单
        document
            .getElementById("searchForm")
            .addEventListener("submit", (e) => {
                e.preventDefault();
                this.searchOrders();
            });

        // 模态框事件
        this.bindModalEvents();

        // 编辑表单
        document.getElementById("editForm").addEventListener("submit", (e) => {
            e.preventDefault();
            this.saveEditedOrder();
        });

        // 确认删除按钮
        document
            .getElementById("confirmDeleteBtn")
            .addEventListener("click", () => {
                this.confirmDelete();
            });

        // 验证记录筛选表单
        document
            .getElementById("verificationFilterForm")
            .addEventListener("submit", (e) => {
                e.preventDefault();
                this.filterVerificationRecords();
            });

        // 重置筛选按钮
        document
            .getElementById("resetFiltersBtn")
            .addEventListener("click", () => {
                this.resetVerificationFilters();
            });

        // 刷新验证记录按钮
        document
            .getElementById("refreshVerificationBtn")
            .addEventListener("click", () => {
                this.loadVerificationRecords();
            });
    }

    setupNavbarBurger() {
        const burger = document.querySelector(".navbar-burger");
        if (!burger) {
            return;
        }

        const targetId = burger.dataset.target;
        const menu = targetId ? document.getElementById(targetId) : null;

        burger.addEventListener("click", () => {
            const isActive = burger.classList.toggle("is-active");
            burger.setAttribute("aria-expanded", String(isActive));
            if (menu) {
                menu.classList.toggle("is-active", isActive);
            }
        });

        if (menu) {
            const collapseMenu = () => {
                burger.classList.remove("is-active");
                burger.setAttribute("aria-expanded", "false");
                menu.classList.remove("is-active");
            };

            menu.querySelectorAll(".navbar-item, .button").forEach((item) => {
                item.addEventListener("click", collapseMenu);
            });
        }
    }

    bindModalEvents() {
        // 关闭模态框
        document.querySelectorAll(".delete, .modal-cancel").forEach((btn) => {
            btn.addEventListener("click", (e) => {
                const modal = e.target.closest(".modal");
                if (modal) {
                    this.closeModal(modal);
                }
            });
        });

        // 点击背景关闭模态框
        document.querySelectorAll(".modal").forEach((modal) => {
            modal.addEventListener("click", (e) => {
                if (e.target === modal) {
                    this.closeModal(modal);
                }
            });
        });
    }

    // API调用方法
    async apiCall(url, options = {}) {
        console.log("🚀 API调用开始:", url);
        console.log("📤 请求选项:", options);

        try {
            // 为验证统计API添加缓存破坏参数
            if (url.includes("/verification-stats")) {
                const timestamp = Date.now();
                const separator = url.includes("?") ? "&" : "?";
                url = `${url}${separator}_t=${timestamp}`;
                console.log("🔄 添加缓存破坏参数:", url);
            }

            const response = await fetch(url, {
                headers: {
                    "Content-Type": "application/json",
                    "Cache-Control": "no-cache",
                    Pragma: "no-cache",
                    ...options.headers,
                },
                cache: "no-store", // 禁用浏览器缓存
                ...options,
            });

            console.log("📥 收到响应:", {
                status: response.status,
                statusText: response.statusText,
                url: response.url,
            });

            const data = await response.json();
            console.log("📊 解析的响应数据:", data);

            if (!response.ok) {
                console.log("❌ 响应状态不正常:", response.status);
                // 区分不同类型的错误
                if (response.status === 401) {
                    // 认证失败，抛出特殊错误
                    const authError = new Error("认证失败，请重新登录");
                    authError.status = 401;
                    authError.isAuthError = true;
                    throw authError;
                } else {
                    // 其他HTTP错误
                    const httpError = new Error(data.message || "请求失败");
                    httpError.status = response.status;
                    httpError.isHttpError = true;
                    throw httpError;
                }
            }

            console.log("✅ API调用成功:", url);
            return data;
        } catch (error) {
            console.error("💥 API调用失败:", error);
            console.error("💥 错误详情:", {
                message: error.message,
                name: error.name,
                stack: error.stack,
            });

            // 区分访问频繁和HTTP错误
            if (error.name === "TypeError" && error.message.includes("fetch")) {
                // 网络连接错误
                const networkError = new Error("网络连接失败，请检查网络连接");
                networkError.isNetworkError = true;
                throw networkError;
            }

            throw error;
        }
    }

    // 通用错误处理方法
    handleApiError(error, customMessage = null) {
        if (error.isAuthError) {
            // 认证失败，跳转到登录页面
            console.warn("用户认证失败，跳转到登录页面");
            this.showLoginScreen("登录已过期，请重新登录");
            return {
                type: "auth",
                message: "登录已过期，请重新登录",
            };
        } else if (error.isNetworkError) {
            // 网络连接错误
            return {
                type: "network",
                message: "网络连接失败，请检查网络连接后重试",
            };
        } else if (error.isHttpError) {
            // HTTP错误
            return {
                type: "http",
                message: customMessage || error.message || "服务器错误",
            };
        } else {
            // 其他错误
            return {
                type: "unknown",
                message:
                    customMessage || error.message || "操作失败，请稍后重试",
            };
        }
    }

    // 认证相关方法
    async checkAuthStatus() {
        try {
            const data = await this.apiCall("/api/admin/status");
            if (data.success && data.authenticated) {
                this.showAdminScreen();
                this.updateSessionInfo(data);
            } else {
                const message =
                    data.success && data.authenticated === false
                        ? "登录状态已过期，请重新登录"
                        : null;
                this.showLoginScreen(message);
            }
        } catch (error) {
            const message = error?.isAuthError
                ? "登录状态已过期，请重新登录"
                : null;
            this.showLoginScreen(message);
        }
    }

    async login() {
        const password = document.getElementById("password").value;
        const messageEl = document.getElementById("loginMessage");

        try {
            const data = await this.apiCall("/api/admin/login", {
                method: "POST",
                body: JSON.stringify({ password }),
            });

            if (data.success) {
                this.showMessage(messageEl, "登录成功", "success");
                setTimeout(() => {
                    this.showAdminScreen();
                }, 1000);
            } else {
                this.showMessage(messageEl, data.message, "error");
            }
        } catch (error) {
            this.showMessage(messageEl, "登录失败: " + error.message, "error");
        }
    }

    async logout() {
        try {
            await this.apiCall("/api/admin/logout", {
                method: "POST",
            });
        } catch (error) {
            console.error("登出失败:", error);
        }
        this.showLoginScreen();
    }

    showLoginScreen(message = null) {
        document.getElementById("loginScreen").classList.remove("is-hidden");
        document.getElementById("adminScreen").classList.add("is-hidden");
        document.getElementById("password").value = "";
        document.getElementById("loginMessage").innerHTML = "";

        // 如果有消息，显示登录提示
        if (message) {
            this.showMessage(
                document.getElementById("loginMessage"),
                message,
                "warning"
            );
        }
    }

    showAdminScreen() {
        document.getElementById("loginScreen").classList.add("is-hidden");
        document.getElementById("adminScreen").classList.remove("is-hidden");
        this.loadOrderList();
        this.startSessionTimer();
    }

    updateSessionInfo(data) {
        const sessionInfo = document.getElementById("sessionInfo");
        sessionInfo.textContent = `登录时长: ${data.sessionAge}分钟`;
    }

    startSessionTimer() {
        // 每分钟更新一次会话信息
        setInterval(async () => {
            try {
                const data = await this.apiCall("/api/admin/status");
                if (data.success) {
                    this.updateSessionInfo(data);
                }
            } catch (error) {
                console.error("获取会话状态失败:", error);
            }
        }, 60000);
    }

    // 标签页切换
    switchTab(tabName) {
        // 更新导航按钮状态
        document.querySelectorAll(".tabs li").forEach((li) => {
            li.classList.remove("is-active");
        });
        document
            .querySelector(`[data-tab="${tabName}"]`)
            .classList.add("is-active");

        // 更新标签页内容
        document.querySelectorAll(".content-section").forEach((content) => {
            content.classList.add("is-hidden");
        });
        document.getElementById(tabName).classList.remove("is-hidden");

        // 加载对应数据
        if (tabName === "order-list") {
            this.loadOrderList();
        } else if (tabName === "verification-records") {
            this.initializeVerificationForm();
            this.loadVerificationRecords();
        }
    }

    // 订单添加方法
    async addSingleOrder() {
        const orderNumber = document
            .getElementById("singleOrderNumber")
            .value.trim();
        const maxAccess = document.getElementById("singleMaxAccess").value;
        const messageEl = document.getElementById("singleAddMessage");

        if (!orderNumber) {
            this.showMessage(messageEl, "请输入订单号", "error");
            return;
        }

        // 验证订单格式（P开头 + 18位数字，共19位）
        if (!ORDER_NUMBER_REGEX.test(orderNumber)) {
            this.showMessage(
                messageEl,
                "订单格式错误，应为P开头+18位数字（如：P123456789012345678）",
                "error"
            );
            return;
        }

        try {
            const data = await this.apiCall("/api/admin/orders/add", {
                method: "POST",
                body: JSON.stringify({
                    orderNumber,
                    maxAccess: maxAccess.trim() === "" ? "" : maxAccess,
                }),
            });

            if (data.success) {
                this.showMessage(messageEl, data.message, "success");
                document.getElementById("singleAddForm").reset();
            } else {
                this.showMessage(messageEl, data.message, "error");
            }
        } catch (error) {
            this.showMessage(messageEl, "添加失败: " + error.message, "error");
        }
    }

    async addBatchOrders() {
        const ordersText = document.getElementById("batchOrders").value.trim();
        const maxAccess = document.getElementById("batchMaxAccess").value;
        const messageEl = document.getElementById("batchAddMessage");

        if (!ordersText) {
            this.showMessage(messageEl, "请输入订单列表", "error");
            return;
        }

        // 解析订单列表
        const orders = [];
        const lines = ordersText.split("\n");
        const invalidOrders = [];

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;

            const parts = trimmedLine.split(",");
            const orderNumber = parts[0].trim();
            const part2 = parts[1] ? parts[1].trim() : "";
            const unifiedMax = maxAccess ? maxAccess.trim() : "";

            // 验证订单格式（P开头 + 18位数字，共19位）
            if (!ORDER_NUMBER_REGEX.test(orderNumber)) {
                invalidOrders.push(orderNumber || "空订单号");
                continue;
            }

            // 处理最大访问次数：优先使用订单行指定的，否则使用统一的
            let orderMaxAccess = null;
            if (part2 !== "") {
                // 订单行指定了访问次数
                orderMaxAccess = part2;
            } else if (unifiedMax !== "") {
                // 使用统一设置的访问次数
                orderMaxAccess = unifiedMax;
            }
            // 否则保持为null，表示无限制

            if (orderNumber) {
                orders.push({
                    orderNumber,
                    maxAccess: orderMaxAccess,
                });
            }
        }

        // 如果有无效的订单格式，显示错误
        if (invalidOrders.length > 0) {
            this.showMessage(
                messageEl,
                `以下订单格式错误：${invalidOrders.join(
                    ", "
                )}，订单应为P开头+18位数字`,
                "error"
            );
            return;
        }

        if (orders.length === 0) {
            this.showMessage(messageEl, "没有有效的订单数据", "error");
            return;
        }

        try {
            const data = await this.apiCall("/api/admin/orders/batch-add", {
                method: "POST",
                body: JSON.stringify({ orders }),
            });

            if (data.success) {
                this.showMessage(
                    messageEl,
                    `${data.message} (成功: ${data.inserted}, 失败: ${data.failed})`,
                    data.failed > 0 ? "warning" : "success"
                );
                if (data.failed === 0) {
                    document.getElementById("batchAddForm").reset();
                }
            } else {
                this.showMessage(messageEl, data.message, "error");
            }
        } catch (error) {
            this.showMessage(
                messageEl,
                "批量添加失败: " + error.message,
                "error"
            );
        }
    }

    // 订单列表方法
    async loadOrderList(page = 1) {
        const tbody = document.getElementById("ordersTableBody");
        const pagination = document.getElementById("listPagination");
        const listInfo = document.getElementById("listInfo");

        try {
            // 使用admin API获取订单列表
            const data = await this.apiCall(
                `/api/admin/orders/list?page=${page}&limit=20`
            );

            if (data.success) {
                this.renderOrderTable(data.orders, tbody);
                this.renderPagination(
                    data.pagination,
                    pagination,
                    this.loadOrderList.bind(this)
                );
                listInfo.textContent = `共 ${data.pagination.total} 个订单`;
                this.currentPage = page;
            } else {
                tbody.innerHTML =
                    '<tr><td colspan="6" class="error">加载失败</td></tr>';
            }
        } catch (error) {
            tbody.innerHTML =
                '<tr><td colspan="6" class="error">加载失败: ' +
                error.message +
                "</td></tr>";
        }
    }

    renderOrderTable(orders, tbody) {
        if (orders.length === 0) {
            tbody.innerHTML =
                '<tr><td colspan="6" style="text-align: center; color: #666;">暂无数据</td></tr>';
            return;
        }

        tbody.innerHTML = orders
            .map(
                (order) => `
            <tr>
                <td>${this.escapeHtml(order.orderNumber)}</td>
                <td>${new Date(order.createdAt).toLocaleString("zh-CN")}</td>
                <td>${
                    order.maxAccess === null ? "无限制" : order.maxAccess
                }</td>
                <td>${order.usageCount}</td>
                <td>${
                    order.remainingAccess === -1
                        ? "无限制"
                        : order.remainingAccess
                }</td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-sm btn-primary" data-action="details" data-order="${this.escapeHtml(
                            order.orderNumber
                        )}">详情</button>
                        <button class="btn btn-sm btn-secondary" data-action="edit" data-order="${this.escapeHtml(
                            order.orderNumber
                        )}">编辑</button>
                        <button class="btn btn-sm btn-danger" data-action="delete" data-order="${this.escapeHtml(
                            order.orderNumber
                        )}">删除</button>
                    </div>
                </td>
            </tr>
        `
            )
            .join("");

        // 添加事件委托
        tbody.addEventListener("click", (e) => {
            const button = e.target.closest("button[data-action]");
            if (button) {
                const action = button.dataset.action;
                const orderNumber = button.dataset.order;

                switch (action) {
                    case "details":
                        this.showOrderDetails(orderNumber);
                        break;
                    case "edit":
                        this.editOrder(orderNumber);
                        break;
                    case "delete":
                        this.deleteOrder(orderNumber);
                        break;
                }
            }
        });
    }

    // 搜索方法
    async searchOrders(page = 1) {
        const query = document.getElementById("searchQuery").value.trim();
        const messageEl = document.getElementById("searchMessage");
        const resultsEl = document.getElementById("searchResults");

        if (!query) {
            this.showMessage(messageEl, "请输入搜索关键词", "error");
            return;
        }

        if (page === 1) {
            this.currentSearchQuery = query;
        }

        try {
            const data = await this.apiCall(
                `/api/admin/orders/search?q=${encodeURIComponent(
                    query
                )}&page=${page}&limit=20`
            );

            if (data.success) {
                resultsEl.classList.remove("is-hidden");

                const tbody = document.getElementById("searchTableBody");
                const pagination = document.getElementById("searchPagination");
                const searchInfo = document.getElementById("searchInfo");

                this.renderOrderTable(data.orders, tbody);
                this.renderPagination(
                    data.pagination,
                    pagination,
                    this.searchOrders.bind(this)
                );
                searchInfo.textContent = `找到 ${data.pagination.total} 个匹配的订单`;

                this.currentSearchPage = page;
                messageEl.innerHTML = "";
            } else {
                this.showMessage(messageEl, data.message, "error");
                resultsEl.classList.add("is-hidden");
            }
        } catch (error) {
            this.showMessage(messageEl, "搜索失败: " + error.message, "error");
            resultsEl.classList.add("is-hidden");
        }
    }

    // 订单详情
    async showOrderDetails(orderNumber) {
        try {
            const data = await this.apiCall(
                `/api/admin/orders/${encodeURIComponent(orderNumber)}/details`
            );

            if (data.success) {
                const detailsEl = document.getElementById("orderDetails");
                detailsEl.innerHTML = `
                    <div class="order-detail">
                        <div class="order-detail-label">订单号</div>
                        <div class="order-detail-value">${this.escapeHtml(
                            data.orderNumber
                        )}</div>
                    </div>
                    <div class="order-detail">
                        <div class="order-detail-label">创建时间</div>
                        <div class="order-detail-value">${new Date(
                            data.createdAt
                        ).toLocaleString("zh-CN")}</div>
                    </div>
                    <div class="order-detail">
                        <div class="order-detail-label">最大访问次数</div>
                        <div class="order-detail-value">${
                            data.maxAccess === null ? "无限制" : data.maxAccess
                        }</div>
                    </div>
                    <div class="order-detail">
                        <div class="order-detail-label">已使用次数</div>
                        <div class="order-detail-value">${data.usageCount}</div>
                    </div>
                    <div class="order-detail">
                        <div class="order-detail-label">剩余访问次数</div>
                        <div class="order-detail-value">${
                            data.remainingAccess === -1
                                ? "无限制"
                                : data.remainingAccess
                        }</div>
                    </div>
                    <div class="order-detail">
                        <div class="order-detail-label">最后使用时间</div>
                        <div class="order-detail-value">${
                            data.lastUsage
                                ? new Date(data.lastUsage).toLocaleString(
                                      "zh-CN"
                                  )
                                : "从未使用"
                        }</div>
                    </div>
                    ${
                        data.usageHistory.length > 0
                            ? `
                        <div class="usage-history">
                            <h4>使用历史</h4>
                            ${data.usageHistory
                                .map(
                                    (record) => `
                                <div class="usage-record">
                                    <strong>访问时间:</strong> ${new Date(
                                        record.accessedAt
                                    ).toLocaleString("zh-CN")}<br>
                                    <strong>IP地址:</strong> ${this.escapeHtml(
                                        record.ipAddress
                                    )}<br>
                                    <strong>User-Agent:</strong> ${this.escapeHtml(
                                        record.userAgent
                                    )}<br>
                                    ${
                                        record.sessionId
                                            ? `<strong>会话ID:</strong> ${this.escapeHtml(
                                                  record.sessionId
                                              )}`
                                            : ""
                                    }
                                </div>
                            `
                                )
                                .join("")}
                        </div>
                    `
                            : ""
                    }
                `;
                this.openModal("orderModal");
            } else {
                alert("获取订单详情失败: " + data.message);
            }
        } catch (error) {
            alert("获取订单详情失败: " + error.message);
        }
    }

    // 编辑订单
    async editOrder(orderNumber) {
        try {
            // 获取当前订单信息
            const data = await this.apiCall(
                `/api/admin/orders/${encodeURIComponent(orderNumber)}/details`
            );

            if (data.success) {
                document.getElementById("editOrderNumber").value =
                    data.orderNumber;
                document.getElementById("editMaxAccess").value =
                    data.maxAccess || "";
                this.openModal("editModal");
            } else {
                alert("获取订单信息失败: " + data.message);
            }
        } catch (error) {
            alert("获取订单信息失败: " + error.message);
        }
    }

    async saveEditedOrder() {
        const orderNumber = document.getElementById("editOrderNumber").value;
        const maxAccess = document.getElementById("editMaxAccess").value;

        try {
            const data = await this.apiCall(
                `/api/admin/orders/${encodeURIComponent(orderNumber)}`,
                {
                    method: "PUT",
                    body: JSON.stringify({
                        maxAccess: maxAccess.trim() === "" ? "" : maxAccess,
                    }),
                }
            );

            if (data.success) {
                this.closeModal("editModal");
                alert("订单更新成功");
                this.loadOrderList(); // 刷新列表
            } else {
                alert("更新失败: " + data.message);
            }
        } catch (error) {
            alert("更新失败: " + error.message);
        }
    }

    // 删除订单
    deleteOrder(orderNumber) {
        document.getElementById("deleteOrderNumber").textContent = orderNumber;
        document.getElementById("confirmDeleteBtn").onclick = () => {
            this.confirmDeleteOrder(orderNumber);
        };
        this.openModal("deleteModal");
    }

    async confirmDeleteOrder(orderNumber) {
        try {
            const data = await this.apiCall(
                `/api/admin/orders/${encodeURIComponent(orderNumber)}`,
                {
                    method: "DELETE",
                }
            );

            if (data.success) {
                this.closeModal("deleteModal");
                alert("订单删除成功");
                this.loadOrderList(); // 刷新列表
            } else {
                alert("删除失败: " + data.message);
            }
        } catch (error) {
            alert("删除失败: " + error.message);
        }
    }

    confirmDelete() {
        // 这个方法由confirmDeleteOrder绑定具体逻辑
    }

    // 工具方法
    renderPagination(pagination, container, loadFunction) {
        console.log("📄 开始渲染分页:", {
            pagination,
            container,
            loadFunction,
        });

        // 检查container是否为有效的DOM元素
        if (!container || typeof container.removeEventListener !== "function") {
            console.error("❌ 无效的container参数:", container);
            return;
        }

        if (pagination.totalPages <= 1) {
            container.innerHTML = "";
            console.log("📄 总页数<=1，清空分页容器");
            return;
        }

        let html = "";

        // 上一页按钮
        html += `<button ${
            pagination.page <= 1 ? "disabled" : ""
        } data-action="page" data-page="${
            pagination.page - 1
        }">上一页</button>`;

        // 页码按钮
        const startPage = Math.max(1, pagination.page - 2);
        const endPage = Math.min(pagination.totalPages, pagination.page + 2);

        if (startPage > 1) {
            html += `<button data-action="page" data-page="1">1</button>`;
            if (startPage > 2) {
                html += "<span>...</span>";
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            html += `<button ${
                i === pagination.page ? 'class="active"' : ""
            } data-action="page" data-page="${i}">${i}</button>`;
        }

        if (endPage < pagination.totalPages) {
            if (endPage < pagination.totalPages - 1) {
                html += "<span>...</span>";
            }
            html += `<button data-action="page" data-page="${pagination.totalPages}">${pagination.totalPages}</button>`;
        }

        // 下一页按钮
        html += `<button ${
            pagination.page >= pagination.totalPages ? "disabled" : ""
        } data-action="page" data-page="${
            pagination.page + 1
        }">下一页</button>`;

        // 页面信息
        html += `<span class="page-info">第 ${pagination.page} 页，共 ${pagination.totalPages} 页</span>`;

        console.log("📄 分页HTML生成完成，长度:", html.length);
        container.innerHTML = html;

        // 移除旧的事件监听器（如果存在）
        if (this._paginationClickHandler) {
            container.removeEventListener(
                "click",
                this._paginationClickHandler
            );
        }

        // 创建并保存新的事件监听器
        this._paginationClickHandler = (e) => {
            const button = e.target.closest('button[data-action="page"]');
            if (button && !button.disabled) {
                e.preventDefault();
                const page = parseInt(button.dataset.page);
                console.log("📄 分页按钮点击，跳转到页面:", page);
                loadFunction.call(this, page);
            }
        };

        // 添加新的事件委托
        container.addEventListener("click", this._paginationClickHandler);
        console.log("✅ 分页渲染完成");
    }

    openModal(modalId) {
        document.getElementById(modalId).classList.add("is-active");
        document.body.style.overflow = "hidden";
    }

    closeModal(modalOrId) {
        const modal =
            typeof modalOrId === "string"
                ? document.getElementById(modalOrId)
                : modalOrId;
        modal.classList.remove("is-active");
        document.body.style.overflow = "";
    }

    showMessage(element, message, type) {
        element.className = `notification is-${type}`;
        element.textContent = message;
        element.classList.remove("is-hidden");

        // 3秒后自动隐藏成功消息
        if (type === "success") {
            setTimeout(() => {
                element.classList.add("is-hidden");
            }, 3000);
        }
    }

    // ================== 验证记录相关方法 ==================

    // 加载验证记录统计
    // 初始化验证记录表单字段
    initializeVerificationForm() {
        // 设置默认日期范围
        document.getElementById("filterDateFrom").value =
            this.currentVerificationFilters.dateFrom;
        document.getElementById("filterDateTo").value =
            this.currentVerificationFilters.dateTo;
        document.getElementById("filterOrderNumber").value =
            this.currentVerificationFilters.orderNumber;
        document.getElementById("sortBy").value =
            this.currentVerificationFilters.sortBy;
        document.getElementById("sortOrder").value =
            this.currentVerificationFilters.sortOrder;
    }

    async loadVerificationRecords(page = 1) {
        const messageEl = document.getElementById("verificationMessage");
        const tableBody = document.getElementById("verificationTableBody");
        const infoEl = document.getElementById("verificationInfo");

        try {
            // 显示加载状态
            tableBody.innerHTML =
                '<tr><td colspan="6" class="loading">加载中...</td></tr>';
            infoEl.textContent = "";

            const params = new URLSearchParams({
                page: page.toString(),
                limit: "20",
                sortBy: this.currentVerificationFilters.sortBy,
                sortOrder: this.currentVerificationFilters.sortOrder,
            });

            // 添加筛选条件
            if (this.currentVerificationFilters.orderNumber) {
                params.append(
                    "orderNumber",
                    this.currentVerificationFilters.orderNumber
                );
            }
            if (this.currentVerificationFilters.dateFrom) {
                params.append(
                    "dateFrom",
                    this.currentVerificationFilters.dateFrom
                );
            }
            if (this.currentVerificationFilters.dateTo) {
                params.append("dateTo", this.currentVerificationFilters.dateTo);
            }

            console.log(
                "正在请求验证记录数据:",
                `/api/admin/verification-stats?${params}`
            );
            const data = await this.apiCall(
                `/api/admin/verification-stats?${params}`
            );
            console.log("验证记录API响应:", data);

            if (data.success) {
                this.currentVerificationPage = page;

                // 显示数据新鲜度信息
                if (data.dataFreshness) {
                    console.log("📊 数据新鲜度信息:", data.dataFreshness);
                    this.displayDataFreshnessInfo(data.dataFreshness);
                }

                this.renderVerificationTable(data.stats);
                this.renderPagination(
                    data.pagination,
                    document.getElementById("verificationPagination"),
                    (newPage) => this.loadVerificationRecords(newPage)
                );

                // 更新页面信息，包含时间戳
                const lastUpdateTime = data.dataFreshness?.queryEndTime
                    ? new Date(data.dataFreshness.queryEndTime).toLocaleString(
                          "zh-CN"
                      )
                    : new Date().toLocaleString("zh-CN");
                infoEl.innerHTML = `共 ${data.pagination.total} 个订单有验证记录 <small>(最后更新: ${lastUpdateTime})</small>`;
                this.hideMessage(messageEl);
            } else {
                console.error("验证记录API返回失败:", data.message);
                tableBody.innerHTML =
                    '<tr><td colspan="6" class="error">加载失败</td></tr>';
                this.showMessage(messageEl, data.message, "error");
            }
        } catch (error) {
            console.error("加载验证记录失败:", error);
            const errorInfo = this.handleApiError(error, "加载验证记录失败");

            tableBody.innerHTML = `<tr><td colspan="6" class="error">${errorInfo.message}</td></tr>`;

            // 只有非认证错误才显示错误消息，认证错误会自动跳转到登录页
            if (errorInfo.type !== "auth") {
                this.showMessage(messageEl, errorInfo.message, "error");
            }
        }
    }

    // 显示数据新鲜度信息
    displayDataFreshnessInfo(dataFreshness) {
        const freshnessInfoEl = document.getElementById("dataFreshnessInfo");
        if (!freshnessInfoEl) {
            // 如果元素不存在，创建它
            const infoEl = document.getElementById("verificationInfo");
            if (infoEl) {
                const freshnessDiv = document.createElement("div");
                freshnessDiv.id = "dataFreshnessInfo";
                freshnessDiv.style.cssText =
                    "font-size: 0.85em; color: #666; margin-top: 5px;";
                infoEl.parentNode.insertBefore(
                    freshnessDiv,
                    infoEl.nextSibling
                );
                freshnessInfoEl = freshnessDiv;
            }
        }

        if (freshnessInfoEl && dataFreshness) {
            const queryTime = new Date(
                dataFreshness.queryEndTime
            ).toLocaleString("zh-CN");
            const duration = dataFreshness.queryDurationMs;

            freshnessInfoEl.innerHTML = `
                📊 ${dataFreshness.message} |
                查询时间: ${queryTime} |
                耗时: ${duration}ms
            `;
        }
    }

    // 渲染验证记录表格
    renderVerificationTable(stats) {
        console.log("🎨 开始渲染验证记录表格，数据:", stats);

        const tableBody = document.getElementById("verificationTableBody");
        console.log("🔍 找到表格body元素:", tableBody);

        if (!stats || stats.length === 0) {
            console.log("📭 没有数据或数据为空");
            tableBody.innerHTML =
                '<tr><td colspan="6" class="no-data">暂无验证记录</td></tr>';
            return;
        }

        console.log("📊 准备渲染", stats.length, "条记录");

        const rows = stats
            .map((stat, index) => {
                console.log(`🔍 处理第${index + 1}条记录:`, stat);

                const remainingAccessText =
                    stat.remainingAccess === -1
                        ? "无限制"
                        : stat.remainingAccess;
                const remainingAccessClass =
                    stat.remainingAccess === -1
                        ? "unlimited"
                        : stat.remainingAccess <= 5
                        ? "warning"
                        : "normal";

                const row = `
                <tr>
                    <td>${this.escapeHtml(stat.orderNumber)}</td>
                    <td>
                        <span class="usage-count ${
                            stat.usageCount > 20 ? "high-usage" : ""
                        }">${stat.usageCount}</span>
                    </td>
                    <td>${
                        stat.firstAccess
                            ? this.formatDateTime(stat.firstAccess)
                            : "未知"
                    }</td>
                    <td>${
                        stat.lastAccess
                            ? this.formatDateTime(stat.lastAccess)
                            : "未知"
                    }</td>
                    <td>
                        <span class="remaining-access ${remainingAccessClass}">${remainingAccessText}</span>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-info" onclick="admin.showVerificationDetails('${this.escapeHtml(
                            stat.orderNumber
                        )}')">
                            查看详情
                        </button>
                    </td>
                </tr>
            `;
                console.log(`✅ 第${index + 1}行HTML生成完成`);
                return row;
            })
            .join("");

        console.log("🎯 准备插入HTML到表格，总长度:", rows.length);
        tableBody.innerHTML = rows;
        console.log("✅ 验证记录表格渲染完成");
    }

    // 筛选验证记录
    async filterVerificationRecords() {
        const messageEl = document.getElementById("verificationMessage");

        // 获取筛选条件
        const orderNumber = document
            .getElementById("filterOrderNumber")
            .value.trim();
        const dateFrom = document.getElementById("filterDateFrom").value;
        const dateTo = document.getElementById("filterDateTo").value;
        const sortBy = document.getElementById("sortBy").value;
        const sortOrder = document.getElementById("sortOrder").value;

        // 验证日期范围不超过1年
        if (dateFrom) {
            const fromDate = new Date(dateFrom);
            const maxDateFrom = new Date();
            maxDateFrom.setFullYear(maxDateFrom.getFullYear() - 1);

            if (fromDate < maxDateFrom) {
                this.showMessage(messageEl, "开始日期不能超过1年前", "error");
                return;
            }
        }

        // 验证日期逻辑性
        if (dateFrom && dateTo && new Date(dateFrom) > new Date(dateTo)) {
            this.showMessage(messageEl, "开始日期不能晚于结束日期", "error");
            return;
        }

        this.currentVerificationFilters.orderNumber = orderNumber;
        this.currentVerificationFilters.dateFrom = dateFrom;
        this.currentVerificationFilters.dateTo = dateTo;
        this.currentVerificationFilters.sortBy = sortBy;
        this.currentVerificationFilters.sortOrder = sortOrder;

        // 重置到第一页并重新加载
        this.currentVerificationPage = 1;
        await this.loadVerificationRecords(1);
    }

    // 重置筛选条件
    resetVerificationFilters() {
        document.getElementById("filterOrderNumber").value = "";
        document.getElementById("filterDateFrom").value = "";
        document.getElementById("filterDateTo").value = "";
        document.getElementById("sortBy").value = "usageCount";
        document.getElementById("sortOrder").value = "desc";

        this.currentVerificationFilters = {
            orderNumber: "",
            dateFrom: "",
            dateTo: "",
            sortBy: "usageCount",
            sortOrder: "desc",
        };

        this.currentVerificationPage = 1;
        this.loadVerificationRecords(1);
    }

    // 显示验证记录详情
    async showVerificationDetails(orderNumber) {
        try {
            this.openModal("verificationDetailsModal");
            document.getElementById("verificationOrderNumber").textContent =
                orderNumber;

            const orderInfoEl = document.getElementById(
                "verificationOrderInfo"
            );
            const recordsTableBody = document.getElementById(
                "verificationRecordsTableBody"
            );
            const recordsInfoEl = document.getElementById(
                "verificationRecordsInfo"
            );

            // 显示加载状态
            orderInfoEl.innerHTML = "<p>加载中...</p>";
            recordsTableBody.innerHTML =
                '<tr><td colspan="5" class="loading">加载中...</td></tr>';

            const data = await this.apiCall(
                `/api/admin/verification-records/${encodeURIComponent(
                    orderNumber
                )}?page=1&limit=50`
            );

            if (data.success) {
                // 显示订单基本信息
                let orderInfoHtml = `<div class="info-grid">`;
                if (data.orderInfo) {
                    orderInfoHtml += `
                        <div class="info-item">
                            <label>订单创建时间:</label>
                            <span>${
                                data.orderInfo.createdAt
                                    ? this.formatDateTime(
                                          data.orderInfo.createdAt
                                      )
                                    : "未知"
                            }</span>
                        </div>
                        <div class="info-item">
                            <label>最大访问次数:</label>
                            <span>${data.orderInfo.maxAccess || "无限制"}</span>
                        </div>
                    `;
                }
                orderInfoHtml += `
                    <div class="info-item">
                        <label>总验证次数:</label>
                        <span class="usage-count">${data.pagination.total}</span>
                    </div>
                </div>`;
                orderInfoEl.innerHTML = orderInfoHtml;

                // 显示验证记录
                this.renderVerificationDetailsTable(data.records);
                this.renderPagination(
                    data.pagination,
                    document.getElementById("verificationRecordsPagination"),
                    (newPage) =>
                        this.loadVerificationDetails(orderNumber, newPage)
                );
                recordsInfoEl.textContent = `共 ${data.pagination.total} 条记录`;

                this.currentVerificationDetailsOrder = orderNumber;
                this.currentVerificationDetailsPage = 1;
            } else {
                orderInfoEl.innerHTML = `<p class="error">${data.message}</p>`;
                recordsTableBody.innerHTML = "";
            }
        } catch (error) {
            console.error("获取验证记录详情失败:", error);
            const errorInfo = this.handleApiError(
                error,
                "获取验证记录详情失败"
            );

            document.getElementById(
                "verificationOrderInfo"
            ).innerHTML = `<p class="error">${errorInfo.message}</p>`;
            document.getElementById("verificationRecordsTableBody").innerHTML =
                "";

            // 如果是认证错误，关闭模态框并跳转到登录页
            if (errorInfo.type === "auth") {
                this.closeModal("verificationDetailsModal");
            }
        }
    }

    // 加载验证记录详情的分页数据
    async loadVerificationDetails(orderNumber, page) {
        try {
            const recordsTableBody = document.getElementById(
                "verificationRecordsTableBody"
            );
            recordsTableBody.innerHTML =
                '<tr><td colspan="5" class="loading">加载中...</td></tr>';

            const data = await this.apiCall(
                `/api/admin/verification-records/${encodeURIComponent(
                    orderNumber
                )}?page=${page}&limit=50`
            );

            if (data.success) {
                this.renderVerificationDetailsTable(data.records);
                this.renderPagination(
                    data.pagination,
                    document.getElementById("verificationRecordsPagination"),
                    (newPage) =>
                        this.loadVerificationDetails(orderNumber, newPage)
                );
                document.getElementById(
                    "verificationRecordsInfo"
                ).textContent = `共 ${data.pagination.total} 条记录`;
                this.currentVerificationDetailsPage = page;
            } else {
                recordsTableBody.innerHTML =
                    '<tr><td colspan="5" class="error">加载失败</td></tr>';
            }
        } catch (error) {
            console.error("加载验证记录详情失败:", error);
            const errorInfo = this.handleApiError(
                error,
                "加载验证记录详情失败"
            );

            recordsTableBody.innerHTML = `<tr><td colspan="5" class="error">${errorInfo.message}</td></tr>`;

            // 如果是认证错误，关闭模态框并跳转到登录页
            if (errorInfo.type === "auth") {
                this.closeModal("verificationDetailsModal");
            }
        }
    }

    // 渲染验证记录详情表格
    renderVerificationDetailsTable(records) {
        const tableBody = document.getElementById(
            "verificationRecordsTableBody"
        );

        if (!records || records.length === 0) {
            tableBody.innerHTML =
                '<tr><td colspan="5" class="no-data">暂无记录</td></tr>';
            return;
        }

        const rows = records
            .map(
                (record) => `
            <tr>
                <td>${this.formatDateTime(record.accessedAt)}</td>
                <td>${this.escapeHtml(record.ipAddress)}</td>
                <td>${this.escapeHtml(record.deviceId || "未知")}</td>
                <td>${this.escapeHtml(record.sessionId || "未知")}</td>
                <td class="user-agent">${this.escapeHtml(record.userAgent)}</td>
            </tr>
        `
            )
            .join("");

        tableBody.innerHTML = rows;
    }

    // 格式化日期时间
    formatDateTime(dateString) {
        if (!dateString) return "未知";
        try {
            const date = new Date(dateString);
            return date.toLocaleString("zh-CN", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
            });
        } catch (error) {
            return "无效日期";
        }
    }

    // 隐藏消息
    hideMessage(element) {
        element.classList.add("is-hidden");
    }

    escapeHtml(text) {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }
}

// 初始化管理界面
let admin;
document.addEventListener("DOMContentLoaded", () => {
    admin = new AdminInterface();
});

// 全局 closeModal 函数，供 HTML 中的 onclick 使用
function closeModal(modalId) {
    if (admin) {
        admin.closeModal(modalId);
    }
}
