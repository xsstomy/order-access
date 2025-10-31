// 管理界面JavaScript
// 小红书订单编号验证正则表达式（P开头 + 18位数字，共19位）
const ORDER_NUMBER_REGEX = /^P[0-9]{18}$/;

class AdminInterface {
    constructor() {
        this.currentPage = 1;
        this.currentSearchPage = 1;
        this.currentSearchQuery = '';
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkAuthStatus();
    }

    bindEvents() {
        // 登录表单
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });

        // 登出按钮
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.logout();
        });

        // 标签页切换
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // 单个添加表单
        document.getElementById('singleAddForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addSingleOrder();
        });

        // 批量添加表单
        document.getElementById('batchAddForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addBatchOrders();
        });

        // 刷新列表按钮
        document.getElementById('refreshListBtn').addEventListener('click', () => {
            this.loadOrderList();
        });

        // 搜索表单
        document.getElementById('searchForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.searchOrders();
        });

        // 模态框事件
        this.bindModalEvents();

        // 编辑表单
        document.getElementById('editForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveEditedOrder();
        });

        // 确认删除按钮
        document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
            this.confirmDelete();
        });
    }

    bindModalEvents() {
        // 关闭模态框
        document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.closeModal(e.target.closest('.modal'));
            });
        });

        // 点击背景关闭模态框
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal);
                }
            });
        });
    }

    // API调用方法
    async apiCall(url, options = {}) {
        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || '请求失败');
            }

            return data;
        } catch (error) {
            console.error('API调用失败:', error);
            throw error;
        }
    }

    // 认证相关方法
    async checkAuthStatus() {
        try {
            const data = await this.apiCall('/api/admin/status');
            if (data.success) {
                this.showAdminScreen();
                this.updateSessionInfo(data);
            } else {
                this.showLoginScreen();
            }
        } catch (error) {
            this.showLoginScreen();
        }
    }

    async login() {
        const password = document.getElementById('password').value;
        const messageEl = document.getElementById('loginMessage');

        try {
            const data = await this.apiCall('/api/admin/login', {
                method: 'POST',
                body: JSON.stringify({ password })
            });

            if (data.success) {
                this.showMessage(messageEl, '登录成功', 'success');
                setTimeout(() => {
                    this.showAdminScreen();
                }, 1000);
            } else {
                this.showMessage(messageEl, data.message, 'error');
            }
        } catch (error) {
            this.showMessage(messageEl, '登录失败: ' + error.message, 'error');
        }
    }

    async logout() {
        try {
            await this.apiCall('/api/admin/logout', {
                method: 'POST'
            });
        } catch (error) {
            console.error('登出失败:', error);
        }
        this.showLoginScreen();
    }

    showLoginScreen() {
        document.getElementById('loginScreen').classList.remove('hidden');
        document.getElementById('adminScreen').classList.add('hidden');
        document.getElementById('password').value = '';
        document.getElementById('loginMessage').innerHTML = '';
    }

    showAdminScreen() {
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('adminScreen').classList.remove('hidden');
        this.loadOrderList();
        this.startSessionTimer();
    }

    updateSessionInfo(data) {
        const sessionInfo = document.getElementById('sessionInfo');
        sessionInfo.textContent = `登录时长: ${data.sessionAge}分钟`;
    }

    startSessionTimer() {
        // 每分钟更新一次会话信息
        setInterval(async () => {
            try {
                const data = await this.apiCall('/api/admin/status');
                if (data.success) {
                    this.updateSessionInfo(data);
                }
            } catch (error) {
                console.error('获取会话状态失败:', error);
            }
        }, 60000);
    }

    // 标签页切换
    switchTab(tabName) {
        // 更新导航按钮状态
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // 更新标签页内容
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName).classList.add('active');

        // 加载对应数据
        if (tabName === 'order-list') {
            this.loadOrderList();
        }
    }

    // 订单添加方法
    async addSingleOrder() {
        const orderNumber = document.getElementById('singleOrderNumber').value.trim();
        const maxAccess = document.getElementById('singleMaxAccess').value;
        const messageEl = document.getElementById('singleAddMessage');

        if (!orderNumber) {
            this.showMessage(messageEl, '请输入订单号', 'error');
            return;
        }

        // 验证订单格式（P开头 + 18位数字，共19位）
        if (!ORDER_NUMBER_REGEX.test(orderNumber)) {
            this.showMessage(messageEl, '订单格式错误，应为P开头+18位数字（如：P123456789012345678）', 'error');
            return;
        }

        try {
            const data = await this.apiCall('/api/admin/orders/add', {
                method: 'POST',
                body: JSON.stringify({
                    orderNumber,
                    maxAccess: maxAccess.trim() === '' ? '' : maxAccess
                })
            });

            if (data.success) {
                this.showMessage(messageEl, data.message, 'success');
                document.getElementById('singleAddForm').reset();
            } else {
                this.showMessage(messageEl, data.message, 'error');
            }
        } catch (error) {
            this.showMessage(messageEl, '添加失败: ' + error.message, 'error');
        }
    }

    async addBatchOrders() {
        const ordersText = document.getElementById('batchOrders').value.trim();
        const maxAccess = document.getElementById('batchMaxAccess').value;
        const messageEl = document.getElementById('batchAddMessage');

        if (!ordersText) {
            this.showMessage(messageEl, '请输入订单列表', 'error');
            return;
        }

        // 解析订单列表
        const orders = [];
        const lines = ordersText.split('\n');
        const invalidOrders = [];

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;

            const parts = trimmedLine.split(',');
            const orderNumber = parts[0].trim();
            const part2 = parts[1] ? parts[1].trim() : '';
            const unifiedMax = maxAccess ? maxAccess.trim() : '';

            // 验证订单格式（P开头 + 18位数字，共19位）
            if (!ORDER_NUMBER_REGEX.test(orderNumber)) {
                invalidOrders.push(orderNumber || '空订单号');
                continue;
            }

            // 处理最大访问次数：优先使用订单行指定的，否则使用统一的
            let orderMaxAccess = null;
            if (part2 !== '') {
                // 订单行指定了访问次数
                orderMaxAccess = part2;
            } else if (unifiedMax !== '') {
                // 使用统一设置的访问次数
                orderMaxAccess = unifiedMax;
            }
            // 否则保持为null，表示无限制

            if (orderNumber) {
                orders.push({
                    orderNumber,
                    maxAccess: orderMaxAccess
                });
            }
        }

        // 如果有无效的订单格式，显示错误
        if (invalidOrders.length > 0) {
            this.showMessage(messageEl, `以下订单格式错误：${invalidOrders.join(', ')}，订单应为P开头+18位数字`, 'error');
            return;
        }

        if (orders.length === 0) {
            this.showMessage(messageEl, '没有有效的订单数据', 'error');
            return;
        }

        try {
            const data = await this.apiCall('/api/admin/orders/batch-add', {
                method: 'POST',
                body: JSON.stringify({ orders })
            });

            if (data.success) {
                this.showMessage(messageEl,
                    `${data.message} (成功: ${data.inserted}, 失败: ${data.failed})`,
                    data.failed > 0 ? 'warning' : 'success'
                );
                if (data.failed === 0) {
                    document.getElementById('batchAddForm').reset();
                }
            } else {
                this.showMessage(messageEl, data.message, 'error');
            }
        } catch (error) {
            this.showMessage(messageEl, '批量添加失败: ' + error.message, 'error');
        }
    }

    // 订单列表方法
    async loadOrderList(page = 1) {
        const tbody = document.getElementById('ordersTableBody');
        const pagination = document.getElementById('listPagination');
        const listInfo = document.getElementById('listInfo');

        try {
            // 使用admin API获取订单列表
            const data = await this.apiCall(`/api/admin/orders/list?page=${page}&limit=20`);

            if (data.success) {
                this.renderOrderTable(data.orders, tbody);
                this.renderPagination(data.pagination, pagination, this.loadOrderList.bind(this));
                listInfo.textContent = `共 ${data.pagination.total} 个订单`;
                this.currentPage = page;
            } else {
                tbody.innerHTML = '<tr><td colspan="6" class="error">加载失败</td></tr>';
            }
        } catch (error) {
            tbody.innerHTML = '<tr><td colspan="6" class="error">加载失败: ' + error.message + '</td></tr>';
        }
    }

    renderOrderTable(orders, tbody) {
        if (orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #666;">暂无数据</td></tr>';
            return;
        }

        tbody.innerHTML = orders.map(order => `
            <tr>
                <td>${this.escapeHtml(order.orderNumber)}</td>
                <td>${new Date(order.createdAt).toLocaleString('zh-CN')}</td>
                <td>${order.maxAccess === null ? '无限制' : order.maxAccess}</td>
                <td>${order.usageCount}</td>
                <td>${order.remainingAccess === -1 ? '无限制' : order.remainingAccess}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-sm btn-primary" data-action="details" data-order="${this.escapeHtml(order.orderNumber)}">详情</button>
                        <button class="btn btn-sm btn-secondary" data-action="edit" data-order="${this.escapeHtml(order.orderNumber)}">编辑</button>
                        <button class="btn btn-sm btn-danger" data-action="delete" data-order="${this.escapeHtml(order.orderNumber)}">删除</button>
                    </div>
                </td>
            </tr>
        `).join('');

        // 添加事件委托
        tbody.addEventListener('click', (e) => {
            const button = e.target.closest('button[data-action]');
            if (button) {
                const action = button.dataset.action;
                const orderNumber = button.dataset.order;

                switch (action) {
                    case 'details':
                        this.showOrderDetails(orderNumber);
                        break;
                    case 'edit':
                        this.editOrder(orderNumber);
                        break;
                    case 'delete':
                        this.deleteOrder(orderNumber);
                        break;
                }
            }
        });
    }

    // 搜索方法
    async searchOrders(page = 1) {
        const query = document.getElementById('searchQuery').value.trim();
        const messageEl = document.getElementById('searchMessage');
        const resultsEl = document.getElementById('searchResults');

        if (!query) {
            this.showMessage(messageEl, '请输入搜索关键词', 'error');
            return;
        }

        if (page === 1) {
            this.currentSearchQuery = query;
        }

        try {
            const data = await this.apiCall(`/api/admin/orders/search?q=${encodeURIComponent(query)}&page=${page}&limit=20`);

            if (data.success) {
                resultsEl.classList.remove('hidden');

                const tbody = document.getElementById('searchTableBody');
                const pagination = document.getElementById('searchPagination');
                const searchInfo = document.getElementById('searchInfo');

                this.renderOrderTable(data.orders, tbody);
                this.renderPagination(data.pagination, pagination, this.searchOrders.bind(this));
                searchInfo.textContent = `找到 ${data.pagination.total} 个匹配的订单`;

                this.currentSearchPage = page;
                messageEl.innerHTML = '';
            } else {
                this.showMessage(messageEl, data.message, 'error');
                resultsEl.classList.add('hidden');
            }
        } catch (error) {
            this.showMessage(messageEl, '搜索失败: ' + error.message, 'error');
            resultsEl.classList.add('hidden');
        }
    }

    // 订单详情
    async showOrderDetails(orderNumber) {
        try {
            const data = await this.apiCall(`/api/admin/orders/${encodeURIComponent(orderNumber)}/details`);

            if (data.success) {
                const detailsEl = document.getElementById('orderDetails');
                detailsEl.innerHTML = `
                    <div class="order-detail">
                        <div class="order-detail-label">订单号</div>
                        <div class="order-detail-value">${this.escapeHtml(data.orderNumber)}</div>
                    </div>
                    <div class="order-detail">
                        <div class="order-detail-label">创建时间</div>
                        <div class="order-detail-value">${new Date(data.createdAt).toLocaleString('zh-CN')}</div>
                    </div>
                    <div class="order-detail">
                        <div class="order-detail-label">最大访问次数</div>
                        <div class="order-detail-value">${data.maxAccess === null ? '无限制' : data.maxAccess}</div>
                    </div>
                    <div class="order-detail">
                        <div class="order-detail-label">已使用次数</div>
                        <div class="order-detail-value">${data.usageCount}</div>
                    </div>
                    <div class="order-detail">
                        <div class="order-detail-label">剩余访问次数</div>
                        <div class="order-detail-value">${data.remainingAccess === -1 ? '无限制' : data.remainingAccess}</div>
                    </div>
                    <div class="order-detail">
                        <div class="order-detail-label">最后使用时间</div>
                        <div class="order-detail-value">${data.lastUsage ? new Date(data.lastUsage).toLocaleString('zh-CN') : '从未使用'}</div>
                    </div>
                    ${data.usageHistory.length > 0 ? `
                        <div class="usage-history">
                            <h4>使用历史</h4>
                            ${data.usageHistory.map(record => `
                                <div class="usage-record">
                                    <strong>访问时间:</strong> ${new Date(record.accessedAt).toLocaleString('zh-CN')}<br>
                                    <strong>IP地址:</strong> ${this.escapeHtml(record.ipAddress)}<br>
                                    <strong>User-Agent:</strong> ${this.escapeHtml(record.userAgent)}<br>
                                    ${record.sessionId ? `<strong>会话ID:</strong> ${this.escapeHtml(record.sessionId)}` : ''}
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                `;
                this.openModal('orderModal');
            } else {
                alert('获取订单详情失败: ' + data.message);
            }
        } catch (error) {
            alert('获取订单详情失败: ' + error.message);
        }
    }

    // 编辑订单
    async editOrder(orderNumber) {
        try {
            // 获取当前订单信息
            const data = await this.apiCall(`/api/admin/orders/${encodeURIComponent(orderNumber)}/details`);

            if (data.success) {
                document.getElementById('editOrderNumber').value = data.orderNumber;
                document.getElementById('editMaxAccess').value = data.maxAccess || '';
                this.openModal('editModal');
            } else {
                alert('获取订单信息失败: ' + data.message);
            }
        } catch (error) {
            alert('获取订单信息失败: ' + error.message);
        }
    }

    async saveEditedOrder() {
        const orderNumber = document.getElementById('editOrderNumber').value;
        const maxAccess = document.getElementById('editMaxAccess').value;

        try {
            const data = await this.apiCall(`/api/admin/orders/${encodeURIComponent(orderNumber)}`, {
                method: 'PUT',
                body: JSON.stringify({
                    maxAccess: maxAccess.trim() === '' ? '' : maxAccess
                })
            });

            if (data.success) {
                this.closeModal('editModal');
                alert('订单更新成功');
                this.loadOrderList(); // 刷新列表
            } else {
                alert('更新失败: ' + data.message);
            }
        } catch (error) {
            alert('更新失败: ' + error.message);
        }
    }

    // 删除订单
    deleteOrder(orderNumber) {
        document.getElementById('deleteOrderNumber').textContent = orderNumber;
        document.getElementById('confirmDeleteBtn').onclick = () => {
            this.confirmDeleteOrder(orderNumber);
        };
        this.openModal('deleteModal');
    }

    async confirmDeleteOrder(orderNumber) {
        try {
            const data = await this.apiCall(`/api/admin/orders/${encodeURIComponent(orderNumber)}`, {
                method: 'DELETE'
            });

            if (data.success) {
                this.closeModal('deleteModal');
                alert('订单删除成功');
                this.loadOrderList(); // 刷新列表
            } else {
                alert('删除失败: ' + data.message);
            }
        } catch (error) {
            alert('删除失败: ' + error.message);
        }
    }

    confirmDelete() {
        // 这个方法由confirmDeleteOrder绑定具体逻辑
    }

    // 工具方法
    renderPagination(pagination, container, loadFunction) {
        if (pagination.totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let html = '';

        // 上一页按钮
        html += `<button ${pagination.page <= 1 ? 'disabled' : ''} data-action="page" data-page="${pagination.page - 1}" data-function="${loadFunction.name}">上一页</button>`;

        // 页码按钮
        const startPage = Math.max(1, pagination.page - 2);
        const endPage = Math.min(pagination.totalPages, pagination.page + 2);

        if (startPage > 1) {
            html += `<button data-action="page" data-page="1" data-function="${loadFunction.name}">1</button>`;
            if (startPage > 2) {
                html += '<span>...</span>';
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            html += `<button ${i === pagination.page ? 'class="active"' : ''} data-action="page" data-page="${i}" data-function="${loadFunction.name}">${i}</button>`;
        }

        if (endPage < pagination.totalPages) {
            if (endPage < pagination.totalPages - 1) {
                html += '<span>...</span>';
            }
            html += `<button data-action="page" data-page="${pagination.totalPages}" data-function="${loadFunction.name}">${pagination.totalPages}</button>`;
        }

        // 下一页按钮
        html += `<button ${pagination.page >= pagination.totalPages ? 'disabled' : ''} data-action="page" data-page="${pagination.page + 1}" data-function="${loadFunction.name}">下一页</button>`;

        // 页面信息
        html += `<span class="page-info">第 ${pagination.page} 页，共 ${pagination.totalPages} 页</span>`;

        container.innerHTML = html;

        // 添加事件委托
        container.addEventListener('click', (e) => {
            const button = e.target.closest('button[data-action="page"]');
            if (button && !button.disabled) {
                const page = parseInt(button.dataset.page);
                const functionName = button.dataset.function;
                this.goToPage(page, functionName);
            }
        });
    }

    goToPage(page, functionName) {
        if (functionName === 'loadOrderList') {
            this.loadOrderList(page);
        } else if (functionName === 'searchOrders') {
            this.searchOrders(page);
        }
    }

    openModal(modalId) {
        document.getElementById(modalId).classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    closeModal(modalOrId) {
        const modal = typeof modalOrId === 'string' ? document.getElementById(modalOrId) : modalOrId;
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }

    showMessage(element, message, type) {
        element.className = `message ${type}`;
        element.textContent = message;
        element.style.display = 'block';

        // 3秒后自动隐藏成功消息
        if (type === 'success') {
            setTimeout(() => {
                element.style.display = 'none';
            }, 3000);
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// 初始化管理界面
let admin;
document.addEventListener('DOMContentLoaded', () => {
    admin = new AdminInterface();
});