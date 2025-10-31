// API调用模块 - 前后端分离版本
class API {
  constructor(baseURL = '') {
    console.log('\n🚀 [API] 初始化API模块...');
    console.log('   当前页面URL:', window.location.href);
    console.log('   主机名:', window.location.hostname);
    console.log('   端口:', window.location.port);

    // 配置后端API地址
    if (baseURL) {
      this.baseURL = baseURL;
      console.log('   使用传入的baseURL:', baseURL);
    } else {
      // 自动检测环境
      if (window.location.hostname === 'localhost' && (window.location.port === '8080' || window.location.port === '8000')) {
        // 前端开发服务器环境
        this.baseURL = 'http://localhost:3000';
        console.log('   检测到前端开发服务器环境，设置baseURL:', this.baseURL);
      } else if (window.location.port === '3002') {
        // 直接访问后端环境（测试用）
        this.baseURL = '';
        console.log('   检测到直接访问后端环境，设置baseURL:', this.baseURL);
      } else {
        // 生产环境，使用相对路径
        this.baseURL = '';
        console.log('   检测到生产环境，设置baseURL:', this.baseURL);
      }
    }

    this.sessionId = localStorage.getItem('sessionId') || null;
    console.log('   最终API Base URL:', this.baseURL);
    console.log('   会话ID:', this.sessionId ? this.sessionId.substring(0, 8) + '...' : '无');
    console.log('🔗 API模块初始化完成\n');
  }

  // 通用请求方法
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    // 添加会话ID
    if (this.sessionId) {
      config.headers['X-Session-ID'] = this.sessionId;
    }

    try {
      console.log(`🔗 API请求: ${config.method || 'GET'} ${url}`);
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }

      console.log(`✅ API响应: ${endpoint}`, data);
      return data;
    } catch (error) {
      console.error(`❌ API请求失败: ${endpoint}`, error);
      throw error;
    }
  }

  // 设置会话ID
  setSessionId(sessionId) {
    this.sessionId = sessionId;
    if (sessionId) {
      localStorage.setItem('sessionId', sessionId);
    } else {
      localStorage.removeItem('sessionId');
    }
  }

  // 获取会话ID
  getSessionId() {
    return this.sessionId;
  }

  // 订单验证API
  async verifyOrder(orderNumber) {
    const result = await this.request('/api/verify', {
      method: 'POST',
      body: JSON.stringify({ orderNumber })
    });

    if (result.success && result.sessionId) {
      this.setSessionId(result.sessionId);
    }

    return result;
  }

  // 检查会话状态
  async checkSessionStatus() {
    try {
      const result = await this.request('/api/session/status');
      return result;
    } catch (error) {
      // 如果会话无效，清除本地存储的sessionId
      this.setSessionId(null);
      throw error;
    }
  }

  // 刷新会话
  async refreshSession() {
    const result = await this.request('/api/session/extend', {
      method: 'POST'
    });
    return result;
  }

  // 退出登录
  async logout() {
    try {
      await this.request('/api/verify/logout', {
        method: 'POST'
      });
    } finally {
      this.setSessionId(null);
    }
  }

  // 获取教程概要
  async getTutorialOverview() {
    return this.request('/api/tutorial/overview');
  }

  // 获取完整教程内容 (需要会话)
  async getTutorialContent() {
    return this.request('/api/tutorial/content');
  }

  // 获取特定章节
  async getTutorialSection(sectionId) {
    return this.request(`/api/tutorial/sections/${sectionId}`);
  }

  // 获取账号信息 (需要会话)
  async getAccounts() {
    return this.request('/api/tutorial/accounts');
  }

  // 搜索教程内容 (需要会话)
  async searchTutorial(keyword) {
    return this.request(`/api/tutorial/search?q=${encodeURIComponent(keyword)}`);
  }

  // 获取系统健康状态
  async getHealthStatus() {
    return this.request('/health');
  }

  // 设置设备ID
  async setDeviceId() {
    return this.request('/api/device/set', {
      method: 'POST'
    });
  }

  // 获取当前设备ID
  async getCurrentDevice() {
    return this.request('/api/device/current');
  }
}

// 创建全局API实例
const api = new API();

// 页面加载时恢复会话
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // 尝试检查会话状态
    await api.checkSessionStatus();
    console.log('✅ 会话已恢复');
  } catch (error) {
    console.log('ℹ️ 无有效会话，需要重新验证');
    api.setSessionId(null);
  }
});

// 导出到全局作用域
window.api = api;