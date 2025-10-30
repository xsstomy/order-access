// UI管理模块 - 简单的页面切换和状态管理
class UIManager {
  constructor() {
    this.currentPage = 'verification';
    this.sessionData = null;
    this.tutorialData = null;
    this.accountIndex = 0;
    this.init();
  }

  init() {
    // 绑定导航事件
    this.bindNavigationEvents();
    // 初始化UI状态
    this.updateUIState();
  }

  // 绑定导航事件
  bindNavigationEvents() {
    // 如果有步骤导航，绑定事件
    const stepLinks = document.querySelectorAll('a[href^="#step"]');
    stepLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href').substring(1);
        this.scrollToSection(targetId);
      });
    });
  }

  // 页面切换
  showPage(pageName) {
    // 隐藏所有页面
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => {
      page.style.display = 'none';
    });

    // 显示目标页面
    const targetPage = document.getElementById(`${pageName}Page`);
    if (targetPage) {
      targetPage.style.display = 'block';
      this.currentPage = pageName;
    }

    // 更新导航状态
    this.updateNavigation(pageName);
  }

  // 滚动到指定章节
  scrollToSection(sectionId) {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  }

  // 显示验证覆盖层
  showVerificationOverlay() {
    const overlay = document.getElementById('verificationOverlay');
    if (overlay) {
      overlay.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }

    const status = document.getElementById('verificationStatus');
    if (status) {
      status.style.display = 'none';
    }
  }

  // 隐藏验证覆盖层
  hideVerificationOverlay() {
    const overlay = document.getElementById('verificationOverlay');
    if (overlay) {
      overlay.style.display = 'none';
      document.body.style.overflow = '';
    }

    const status = document.getElementById('verificationStatus');
    if (status) {
      status.style.display = 'flex';
    }
  }

  // 显示加载状态
  showLoading(element, isLoading = true) {
    if (typeof element === 'string') {
      element = document.getElementById(element);
    }

    if (!element) return;

    if (isLoading) {
      element.disabled = true;
      element.classList.add('loading');

      // 查找加载和文本元素
      const textElement = element.querySelector('.btn-text, .text');
      const loadingElement = element.querySelector('.btn-loading, .loading-text');

      if (textElement) textElement.style.display = 'none';
      if (loadingElement) loadingElement.style.display = 'inline';
    } else {
      element.disabled = false;
      element.classList.remove('loading');

      const textElement = element.querySelector('.btn-text, .text');
      const loadingElement = element.querySelector('.btn-loading, .loading-text');

      if (textElement) textElement.style.display = 'inline';
      if (loadingElement) loadingElement.style.display = 'none';
    }
  }

  // 显示消息
  showMessage(type, message, duration = 3000) {
    // 隐藏所有消息
    const messages = document.querySelectorAll('.message');
    messages.forEach(msg => {
      msg.style.display = 'none';
    });

    // 显示指定类型的消息
    let messageElement;
    if (type === 'error') {
      messageElement = document.getElementById('errorMessage');
    } else if (type === 'success') {
      messageElement = document.getElementById('successMessage');
    }

    if (messageElement) {
      const textElement = messageElement.querySelector('.message-text');
      if (textElement) {
        textElement.textContent = message;
      }
      messageElement.style.display = 'flex';

      // 自动隐藏消息
      if (duration > 0) {
        setTimeout(() => {
          messageElement.style.display = 'none';
        }, duration);
      }
    }

    // 也可以用 alert 作为备选方案
    if (!messageElement) {
      const prefix = type === 'error' ? '❌ ' : '✅ ';
      alert(prefix + message);
    }
  }

  // 隐藏所有消息
  hideMessages() {
    const messages = document.querySelectorAll('.message');
    messages.forEach(msg => {
      msg.style.display = 'none';
    });
  }

  // 更新会话状态显示
  updateSessionStatus(sessionData) {
    this.sessionData = sessionData;

    const statusElement = document.getElementById('verificationStatus');
    const timerElement = document.getElementById('sessionTimer');

    if (statusElement && sessionData) {
      statusElement.style.display = 'flex';

      if (timerElement && sessionData.remainingTime) {
        this.startSessionTimer(sessionData.remainingTime);
      }
    }
  }

  // 会话计时器
  startSessionTimer(remainingTime) {
    if (this.sessionTimer) {
      clearInterval(this.sessionTimer);
    }

    const timerElement = document.getElementById('sessionTimer');
    if (!timerElement) return;

    let timeLeft = remainingTime;

    this.sessionTimer = setInterval(() => {
      if (timeLeft <= 0) {
        clearInterval(this.sessionTimer);
        this.handleSessionExpired();
        return;
      }

      const hours = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

      let timeText = '';
      if (hours > 0) {
        timeText = `${hours}小时${minutes}分`;
      } else if (minutes > 0) {
        timeText = `${minutes}分${seconds}秒`;
      } else {
        timeText = `${seconds}秒`;
      }

      timerElement.textContent = `剩余: ${timeText}`;
      timeLeft -= 1000;
    }, 1000);
  }

  // 处理会话过期
  handleSessionExpired() {
    this.sessionData = null;
    this.showVerificationOverlay();
    this.showMessage('error', '会话已过期，请重新验证订单号');
  }

  // 更新导航状态
  updateNavigation(pageName) {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('data-page') === pageName) {
        link.classList.add('active');
      }
    });
  }

  // 更新教程内容
  updateTutorialContent(tutorialData) {
    this.tutorialData = tutorialData;

    // 更新标题
    const titleElement = document.querySelector('title');
    if (titleElement && tutorialData.title) {
      titleElement.textContent = tutorialData.title;
    }

    // 可以在这里更新更多教程内容
    console.log('教程内容已更新:', tutorialData.title);
  }

  // 更新账号信息
  updateAccounts(accounts) {
    const accountElement = document.getElementById('account');
    const passwordElement = document.getElementById('password');

    if (accounts && accounts.length > 0) {
      const currentAccount = accounts[this.accountIndex] || accounts[0];

      if (accountElement) accountElement.textContent = currentAccount.account;
      if (passwordElement) passwordElement.textContent = currentAccount.password;
    }
  }

  // 切换账号
  switchAccount() {
    if (!this.tutorialData || !this.tutorialData.sections) return;

    // 找到包含账号的章节
    const step2Section = this.tutorialData.sections.find(s => s.id === 'step2');
    if (step2Section && step2Section.accounts) {
      this.accountIndex = (this.accountIndex + 1) % step2Section.accounts.length;
      this.updateAccounts(step2Section.accounts);
    }
  }

  // 更新UI状态
  updateUIState() {
    // 检查URL参数
    const urlParams = new URLSearchParams(window.location.search);
    const orderNumber = urlParams.get('orderNumber');

    if (orderNumber) {
      const orderInput = document.getElementById('orderNumber');
      if (orderInput) {
        orderInput.value = orderNumber;
      }
    }

    // 初始化覆盖层状态
    const overlay = document.getElementById('fullscreen-overlay');
    if (overlay) {
      overlay.classList.remove('show');
    }
  }

  // 获取当前状态
  getState() {
    return {
      currentPage: this.currentPage,
      sessionData: this.sessionData,
      tutorialData: this.tutorialData,
      accountIndex: this.accountIndex
    };
  }

  // 恢复状态
  restoreState(state) {
    if (state.sessionData) {
      this.updateSessionStatus(state.sessionData);
    }
    if (state.tutorialData) {
      this.updateTutorialContent(state.tutorialData);
    }
    if (state.accountIndex !== undefined) {
      this.accountIndex = state.accountIndex;
    }
  }
}

// 创建全局UI管理器实例
const uiManager = new UIManager();

// 导出到全局作用域
window.uiManager = uiManager;