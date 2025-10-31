// 管理员界面 JavaScript

class AdminManager {
    constructor() {
        this.api = new API();
        this.init();
    }

    async init() {
        this.bindEvents();
        await this.checkAuth();
    }

    bindEvents() {
        // 登录表单
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));

        // 登出按钮
        document.getElementById('logoutBtn').addEventListener('click', () => this.handleLogout());

        // 导航标签
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // 单个添加订单
        document.getElementById('singleAddForm').addEventListener('submit', (e) => this.handleSingleAdd(e));

        // 批量添加订单
        document.getElementById('batchAddForm').addEventListener('submit', (e) => this.handleBatchAdd(e));

        // 文件导入订单
        document.getElementById('fileImportForm').addEventListener('submit', (e) => this.handleFileImport(e));

        // 刷新列表按钮
        document.getElementById('refreshListBtn').addEventListener('click', () => this.loadOrderList());

        // 搜索表单
        document.getElementById('searchForm').addEventListener('submit', (e) => this.handleSearch(e));
    }

    // 检查认证状态
    async checkAuth() {
        try {
            const response = await this.api.request('/api/admin/status');
            if (response.success) {
                this.showAdminScreen();
                this.updateSessionInfo(response.loginTime, response.sessionAge);
            } else {
                this.showLoginScreen();
            }
        } catch (error) {
            this.showLoginScreen();
        }
    }

    // 显示登录界面
    showLoginScreen() {
        document.getElementById('loginScreen').classList.remove('hidden');
        document.getElementById('adminScreen').classList.add('hidden');
    }

    // 显示管理界面
    showAdminScreen() {
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('adminScreen').classList.remove('hidden');
        this.loadOrderList();
    }

    // 处理登录
    async handleLogin(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const password = formData.get('password');

        try {
            const response = await this.api.request('/api/admin/login', {
                method: 'POST',
                body: JSON.stringify({ password })
            });

            if (response.success) {
                this.showMessage('loginMessage', '登录成功', 'success');
                this.showAdminScreen();
            } else {
                this.showMessage('loginMessage', response.message || '登录失败', 'error');
            }
        } catch (error) {
            this.showMessage('loginMessage', '登录请求失败', 'error');
        }
    }

    // 处理登出
    async handleLogout() {
        try {
            await this.api.request('/api/admin/logout', { method: 'POST' });
        } catch (error) {
            console.error('登出请求失败:', error);
        }
        this.showLoginScreen();
        this.showMessage('loginMessage', '已安全登出', 'success');
    }

    // 更新会话信息
    updateSessionInfo(loginTime, sessionAge) {
        const sessionInfo = document.getElementById('sessionInfo');
        const loginDate = new Date(loginTime).toLocaleString('zh-CN');
        sessionInfo.textContent = `登录时间: ${loginDate} (${sessionAge}分钟前)`;
    }

    // 切换标签页
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

        // 如果是订单列表标签，刷新数据
        if (tabName === 'order-list') {
            this.loadOrderList();
        }
    }

    // 处理单个添加订单
    async handleSingleAdd(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const orderNumber = formData.get('orderNumber') || document.getElementById('singleOrderNumber').value.trim();
        const maxAccess = formData.get('maxAccess') || document.getElementById('singleMaxAccess').value;

        if (!orderNumber) {
            this.showMessage('singleAddMessage', '请输入订单号', 'error');
            return;
        }

        try {
            const response = await this.api.request('/api/admin/orders/add', {
                method: 'POST',
                body: JSON.stringify({
                    orderNumber,
                    maxAccess: maxAccess || null
                })
            });

            if (response.success) {
                this.showMessage('singleAddMessage', response.message, 'success');
                e.target.reset();
            } else {
                this.showMessage('singleAddMessage', response.message, 'error');
            }
        } catch (error) {
            this.showMessage('singleAddMessage', '添加失败，请重试', 'error');
        }
    }

    // 处理批量添加订单
    async handleBatchAdd(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const ordersText = formData.get('orders') || document.getElementById('batchOrders').value.trim();
        const maxAccess = formData.get('maxAccess') || document.getElementById('batchMaxAccess').value;

        if (!ordersText) {
            this.showMessage('batchAddMessage', '请输入订单列表', 'error');
            return;
        }

        // 解析订单列表
        const lines = ordersText.split('\n').filter(line => line.trim());
        const orders = lines.map(line => {
            const [orderNumber, access] = line.split(',').map(s => s.trim());
            return {
                orderNumber,
                maxAccess: access ? parseInt(access) : (maxAccess ? parseInt(maxAccess) : null)
            };
        });

        try {
            const response = await this.api.request('/api/admin/orders/batch-add', {
                method: 'POST',
                body: JSON.stringify({ orders })
            });

            if (response.success) {
                this.showMessage('batchAddMessage', response.message, 'success');
                e.target.reset();
            } else {
                this.showMessage('batchAddMessage', response.message, 'error');
            }
        } catch (error) {
            this.showMessage('batchAddMessage', '批量添加失败，请重试', 'error');
        }
    }

    // 处理文件导入订单
    async handleFileImport(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const fileInput = document.getElementById('fileInput');
        const maxAccess = document.getElementById('fileMaxAccess').value;

        if (!fileInput.files.length) {
            this.showMessage('fileImportMessage', '请选择要上传的文件', 'error');
            return;
        }

        const file = fileInput.files[0];

        // 显示上传进度
        document.getElementById('uploadBtnText').classList.add('hidden');
        document.getElementById('uploadProgress').classList.remove('hidden');
        document.getElementById('importResults').classList.add('hidden');

        try {
            // 创建 FormData 对象
            const uploadFormData = new FormData();
            uploadFormData.append('file', file);
            if (maxAccess) {
                uploadFormData.append('maxAccess', maxAccess);
            }

            const response = await this.api.request('/api/admin/orders/import-text', {
                method: 'POST',
                body: uploadFormData,
                isFormData: true // 标记为 FormData，不让 JSON.stringify
            });

            if (response.success) {
                this.showMessage('fileImportMessage', response.message, 'success');
                this.displayImportResults(response.statistics, response.invalidOrders);
                e.target.reset();
            } else {
                this.showMessage('fileImportMessage', response.message, 'error');
                if (response.invalidOrders) {
                    this.displayImportResults(response.statistics, response.invalidOrders);
                }
            }
        } catch (error) {
            this.showMessage('fileImportMessage', '文件导入失败，请重试', 'error');
        } finally {
            // 隐藏上传进度
            document.getElementById('uploadBtnText').classList.remove('hidden');
            document.getElementById('uploadProgress').classList.add('hidden');
        }
    }

    // 显示导入结果
    displayImportResults(statistics, invalidOrders) {
        const resultsDiv = document.getElementById('importResults');

        // 更新统计数据
        document.getElementById('statTotalLines').textContent = statistics.totalLines || 0;
        document.getElementById('statValidOrders').textContent = statistics.validOrders || 0;
        document.getElementById('statInserted').textContent = statistics.inserted || 0;
        document.getElementById('statDuplicates').textContent = statistics.duplicates || 0;
        document.getElementById('statInvalid').textContent = statistics.invalid || 0;

        // 显示无效订单列表（如果有）
        if (invalidOrders && invalidOrders.length > 0) {
            const invalidListDiv = document.getElementById('invalidOrdersList');
            const invalidItems = document.getElementById('invalidOrdersItems');

            invalidItems.innerHTML = '';
            invalidOrders.forEach(item => {
                const li = document.createElement('li');
                li.textContent = `第${item.lineNumber}行: ${item.orderNumber} (${item.reason})`;
                invalidItems.appendChild(li);
            });

            invalidListDiv.classList.remove('hidden');
        } else {
            document.getElementById('invalidOrdersList').classList.add('hidden');
        }

        resultsDiv.classList.remove('hidden');
    }

    // 加载订单列表
    async loadOrderList(page = 1, limit = 20) {
        try {
            const response = await this.api.request(`/api/admin/orders/list?page=${page}&limit=${limit}`);

            if (response.success) {
                this.displayOrderList(response.orders, response.pagination);
                this.updateListInfo(response.pagination);
            }
        } catch (error) {
            console.error('加载订单列表失败:', error);
        }
    }

    // 显示订单列表
    displayOrderList(orders, pagination) {
        const table = document.getElementById('ordersTable');
        const tbody = table.querySelector('tbody') || table.createTBody();

        tbody.innerHTML = '';

        if (orders.length === 0) {
            const row = tbody.insertRow();
            const cell = row.insertCell();
            cell.colSpan = table.querySelectorAll('th').length;
            cell.textContent = '暂无订单数据';
            cell.style.textAlign = 'center';
            cell.style.padding = '20px';
            return;
        }

        orders.forEach(order => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${order.orderNumber}</td>
                <td>${new Date(order.createdAt).toLocaleString('zh-CN')}</td>
                <td>${order.maxAccess === null ? '无限制' : order.maxAccess}</td>
                <td>${order.usageCount}</td>
                <td>${order.remainingAccess === -1 ? '无限制' : order.remainingAccess}</td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="adminManager.viewOrderDetails('${order.orderNumber}')">详情</button>
                    <button class="btn btn-sm btn-warning" onclick="adminManager.editOrder('${order.orderNumber}')">编辑</button>
                    <button class="btn btn-sm btn-danger" onclick="adminManager.deleteOrder('${order.orderNumber}')">删除</button>
                </td>
            `;
        });
    }

    // 更新列表信息
    updateListInfo(pagination) {
        const listInfo = document.getElementById('listInfo');
        listInfo.textContent = `第 ${pagination.page} 页，共 ${pagination.totalPages} 页，总计 ${pagination.total} 条记录`;
    }

    // 处理搜索
    async handleSearch(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const query = formData.get('query')?.trim();

        if (!query) {
            this.showMessage('searchMessage', '请输入搜索关键词', 'error');
            return;
        }

        try {
            const response = await this.api.request(`/api/admin/orders/search?q=${encodeURIComponent(query)}&page=1&limit=20`);

            if (response.success) {
                this.displaySearchResults(response.orders, response.pagination, query);
            } else {
                this.showMessage('searchMessage', response.message, 'error');
            }
        } catch (error) {
            this.showMessage('searchMessage', '搜索失败，请重试', 'error');
        }
    }

    // 显示搜索结果
    displaySearchResults(orders, pagination, query) {
        // 这里可以复用订单列表的显示逻辑
        this.displayOrderList(orders, pagination);

        // 更新列表信息为搜索结果信息
        const listInfo = document.getElementById('listInfo');
        listInfo.textContent = `搜索 "${query}" 的结果：第 ${pagination.page} 页，共 ${pagination.totalPages} 页，总计 ${pagination.total} 条记录`;
    }

    // 查看订单详情
    async viewOrderDetails(orderNumber) {
        try {
            const response = await this.api.request(`/api/admin/orders/${encodeURIComponent(orderNumber)}/details`);

            if (response.success) {
                // 这里可以显示一个模态框来展示详细信息
                console.log('订单详情:', response.orderDetails);
                alert(`订单 ${orderNumber} 的详细信息：\n使用次数: ${response.orderDetails.usageCount}\n创建时间: ${new Date(response.orderDetails.createdAt).toLocaleString('zh-CN')}`);
            }
        } catch (error) {
            alert('获取订单详情失败');
        }
    }

    // 编辑订单
    editOrder(orderNumber) {
        const maxAccess = prompt(`请输入订单 ${orderNumber} 的最大访问次数（留空表示无限制）:`);

        if (maxAccess !== null) {
            this.updateOrder(orderNumber, maxAccess === '' ? null : parseInt(maxAccess));
        }
    }

    // 更新订单
    async updateOrder(orderNumber, maxAccess) {
        try {
            const response = await this.api.request(`/api/admin/orders/${encodeURIComponent(orderNumber)}`, {
                method: 'PUT',
                body: JSON.stringify({ maxAccess })
            });

            if (response.success) {
                alert('订单更新成功');
                this.loadOrderList();
            } else {
                alert(`更新失败: ${response.message}`);
            }
        } catch (error) {
            alert('更新失败，请重试');
        }
    }

    // 删除订单
    deleteOrder(orderNumber) {
        if (confirm(`确定要删除订单 ${orderNumber} 吗？此操作不可恢复！`)) {
            this.confirmDelete(orderNumber);
        }
    }

    // 确认删除
    async confirmDelete(orderNumber) {
        try {
            const response = await this.api.request(`/api/admin/orders/${encodeURIComponent(orderNumber)}`, {
                method: 'DELETE'
            });

            if (response.success) {
                alert('订单删除成功');
                this.loadOrderList();
            } else {
                alert(`删除失败: ${response.message}`);
            }
        } catch (error) {
            alert('删除失败，请重试');
        }
    }

    // 显示消息
    showMessage(elementId, message, type = 'info') {
        const messageElement = document.getElementById(elementId);
        if (messageElement) {
            messageElement.textContent = message;
            messageElement.className = `message ${type}`;
            messageElement.style.display = 'block';

            // 3秒后自动隐藏
            setTimeout(() => {
                messageElement.style.display = 'none';
            }, 3000);
        }
    }
}

// 扩展 API 类以支持 FormData
class API extends window.API {
    async request(endpoint, options = {}) {
        const defaultOptions = {
            headers: {}
        };

        // 如果不是 FormData，添加 Content-Type
        if (!options.isFormData) {
            defaultOptions.headers['Content-Type'] = 'application/json';
        }

        const mergedOptions = { ...defaultOptions, ...options };

        // 如果不是 FormData，序列化 body
        if (mergedOptions.body && !options.isFormData && typeof mergedOptions.body === 'object') {
            mergedOptions.body = JSON.stringify(mergedOptions.body);
        }

        // 删除 isFormData 标记
        delete mergedOptions.isFormData;

        return super.request(endpoint, mergedOptions);
    }
}

// 初始化管理员界面
let adminManager;
document.addEventListener('DOMContentLoaded', () => {
    adminManager = new AdminManager();
    window.adminManager = adminManager; // 暴露到全局作用域供内联事件处理
});