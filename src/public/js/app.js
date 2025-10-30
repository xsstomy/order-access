// 全局变量
let currentSessionId = null;
let sessionCheckInterval = null;

// DOM 元素
const elements = {
  verificationForm: document.getElementById('verificationForm'),
  orderNumberInput: document.getElementById('orderNumber'),
  submitBtn: document.getElementById('submitBtn'),
  btnText: document.querySelector('.btn-text'),
  btnLoading: document.querySelector('.btn-loading'),
  errorMessage: document.getElementById('errorMessage'),
  successMessage: document.getElementById('successMessage'),
  errorText: document.querySelector('.error-message .message-text'),
  successText: document.querySelector('.success-message .message-text'),
  verificationSection: document.getElementById('verificationSection'),
  contentSection: document.getElementById('contentSection'),
  orderInfo: document.getElementById('orderInfo'),
  logoutBtn: document.getElementById('logoutBtn'),
  refreshSessionBtn: document.getElementById('refreshSessionBtn'),
  sessionStatus: document.getElementById('sessionStatus'),
  modal: document.getElementById('modal'),
  modalTitle: document.getElementById('modalTitle'),
  modalBody: document.getElementById('modalBody')
};

// 工具函数
function showLoading(isLoading) {
  if (isLoading) {
    elements.submitBtn.disabled = true;
    elements.btnText.style.display = 'none';
    elements.btnLoading.style.display = 'inline-flex';
  } else {
    elements.submitBtn.disabled = false;
    elements.btnText.style.display = 'inline';
    elements.btnLoading.style.display = 'none';
  }
}

function hideMessages() {
  elements.errorMessage.style.display = 'none';
  elements.successMessage.style.display = 'none';
}

function showError(message) {
  hideMessages();
  elements.errorText.textContent = message;
  elements.errorMessage.style.display = 'flex';
  console.error('显示错误消息:', message);
}

function showSuccess(message) {
  hideMessages();
  elements.successText.textContent = message;
  elements.successMessage.style.display = 'flex';
  console.log('显示成功消息:', message);
}

function showModal(title, content) {
  elements.modalTitle.textContent = title;
  elements.modalBody.innerHTML = content;
  elements.modal.style.display = 'flex';
}

function closeModal() {
  elements.modal.style.display = 'none';
}

// API 请求函数
async function verifyOrder(orderNumber) {
  try {
    const response = await fetch('/api/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-ID': currentSessionId
      },
      body: JSON.stringify({ orderNumber })
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API请求失败:', error);
    throw new Error('网络请求失败，请检查网络连接');
  }
}

async function validateSession(sessionId) {
  try {
    const response = await fetch(`/api/verify/session?sessionId=${sessionId}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('会话验证失败:', error);
    return { success: false };
  }
}

async function logoutSession() {
  try {
    const response = await fetch('/api/verify/logout', {
      method: 'POST',
      headers: {
        'X-Session-ID': currentSessionId
      }
    });
    return await response.json();
  } catch (error) {
    console.error('退出登录失败:', error);
    return { success: false };
  }
}

// 会话管理
function startSessionCheck() {
  // 每5分钟检查一次会话状态
  sessionCheckInterval = setInterval(async () => {
    if (currentSessionId) {
      const result = await validateSession(currentSessionId);
      if (!result.success) {
        console.log('会话已过期，重新跳转到验证页面');
        showVerificationForm();
        showError('会话已过期，请重新验证订单');
      }
    }
  }, 300000); // 5分钟
}

function stopSessionCheck() {
  if (sessionCheckInterval) {
    clearInterval(sessionCheckInterval);
    sessionCheckInterval = null;
  }
}

function updateSessionStatus(orderNumber, remainingAccess = null) {
  let statusText = `当前订单: ${orderNumber}`;
  if (remainingAccess !== null && remainingAccess !== -1) {
    statusText += ` | 剩余访问次数: ${remainingAccess}`;
  } else if (remainingAccess === -1) {
    statusText += ' | 无限访问';
  }
  elements.sessionStatus.textContent = statusText;
}

// 页面切换
function showContentArea(orderNumber, remainingAccess = null) {
  elements.verificationSection.style.display = 'none';
  elements.contentSection.style.display = 'block';

  let orderInfoText = `订单号: ${orderNumber}`;
  if (remainingAccess !== null && remainingAccess !== -1) {
    orderInfoText += ` (剩余 ${remainingAccess} 次访问)`;
  } else if (remainingAccess === -1) {
    orderInfoText += ' (无限访问)';
  }

  elements.orderInfo.textContent = orderInfoText;
  updateSessionStatus(orderNumber, remainingAccess);

  startSessionCheck();
}

function showVerificationForm() {
  stopSessionCheck();
  currentSessionId = null;
  elements.verificationSection.style.display = 'block';
  elements.contentSection.style.display = 'none';
  elements.sessionStatus.textContent = '';
  elements.orderNumberInput.value = '';
  hideMessages();
}

// 事件处理函数
async function handleFormSubmit(event) {
  event.preventDefault();

  const orderNumber = elements.orderNumberInput.value.trim();

  if (!orderNumber) {
    showError('请输入订单号');
    return;
  }

  if (orderNumber.length < 8 || orderNumber.length > 30) {
    showError('订单号格式不正确，应为8-30位字符');
    return;
  }

  showLoading(true);
  hideMessages();

  try {
    const result = await verifyOrder(orderNumber);

    if (result.success) {
      currentSessionId = result.sessionId;
      showSuccess('订单验证成功！');

      // 保存会话到 localStorage
      localStorage.setItem('sessionId', currentSessionId);
      localStorage.setItem('orderNumber', orderNumber);

      // 延迟显示内容区域
      setTimeout(() => {
        showContentArea(orderNumber, result.remainingAccess);
      }, 1000);

    } else {
      showError(result.message || '验证失败，请稍后再试或联系客服');
    }
  } catch (error) {
    showError(error.message);
  } finally {
    showLoading(false);
  }
}

async function handleLogout() {
  try {
    await logoutSession();
    localStorage.removeItem('sessionId');
    localStorage.removeItem('orderNumber');
    showVerificationForm();
    showSuccess('已成功退出登录');
  } catch (error) {
    showError('退出登录失败，请重试');
  }
}

async function handleRefreshSession() {
  if (!currentSessionId) return;

  try {
    const result = await validateSession(currentSessionId);
    if (result.success) {
      showSuccess('会话已刷新');
      const session = result.session;
      updateSessionStatus(session.orderNumber);
    } else {
      showVerificationForm();
      showError('会话已失效，请重新验证');
    }
  } catch (error) {
    showError('刷新会话失败，请重试');
  }
}

// 页面初始化
async function initializePage() {
  // 检查是否有保存的会话
  const savedSessionId = localStorage.getItem('sessionId');
  const savedOrderNumber = localStorage.getItem('orderNumber');

  if (savedSessionId && savedOrderNumber) {
    console.log('发现保存的会话，正在验证...');
    const result = await validateSession(savedSessionId);

    if (result.success) {
      currentSessionId = savedSessionId;
      showContentArea(savedOrderNumber);
      console.log('会话验证成功，自动登录');
    } else {
      localStorage.removeItem('sessionId');
      localStorage.removeItem('orderNumber');
      console.log('保存的会话已失效');
    }
  }

  // 绑定事件监听器
  elements.verificationForm.addEventListener('submit', handleFormSubmit);
  elements.logoutBtn.addEventListener('click', handleLogout);
  elements.refreshSessionBtn.addEventListener('click', handleRefreshSession);

  // 模态框点击外部关闭
  elements.modal.addEventListener('click', (event) => {
    if (event.target === elements.modal) {
      closeModal();
    }
  });

  // 订单号输入框回车提交
  elements.orderNumberInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      elements.verificationForm.dispatchEvent(new Event('submit'));
    }
  });

  // 输入框聚焦
  elements.orderNumberInput.addEventListener('focus', () => {
    hideMessages();
  });

  console.log('页面初始化完成');
}

// 辅助函数
function showPrivacyInfo() {
  const content = `
    <h4>隐私政策</h4>
    <p><strong>信息收集：</strong></p>
    <ul>
      <li>我们仅收集订单号和必要的访问日志</li>
      <li>不会收集个人身份信息</li>
      <li>不会与第三方共享您的数据</li>
    </ul>

    <p><strong>数据使用：</strong></p>
    <ul>
      <li>订单验证和访问控制</li>
      <li>系统安全监控</li>
      <li>服务改进和问题排查</li>
    </ul>

    <p><strong>数据存储：</strong></p>
    <ul>
      <li>访问记录会在合理期限内保存</li>
      <li>采用行业标准的安全措施</li>
      <li>您有权要求删除相关数据</li>
    </ul>

    <p><small>最后更新时间：2025年1月</small></p>
  `;
  showModal('隐私政策', content);
}

function showHelpInfo() {
  const content = `
    <h4>使用帮助</h4>

    <p><strong>如何使用：</strong></p>
    <ol>
      <li>在输入框中输入您的订单号</li>
      <li>点击"验证订单"按钮</li>
      <li>验证成功后即可访问付费内容</li>
    </ol>

    <p><strong>常见问题：</strong></p>
    <p><strong>Q: 订单号格式要求？</strong><br>
    A: 通常为8-30位字母和数字组合，具体请参考您的购买确认信息。</p>

    <p><strong>Q: 验证失败怎么办？</strong><br>
    A: 请检查订单号是否正确，或联系客服获取帮助。</p>

    <p><strong>Q: 会话有效期多久？</strong><br>
    A: 验证成功后的会话有效期为2小时，期间可以自由访问内容。</p>

    <p><strong>Q: 单次订单和多次订单有什么区别？</strong><br>
    A: 单次订单只能验证一次，多次订单可以多次访问（可能有次数限制）。</p>

    <p><strong>联系支持：</strong><br>
    如遇到问题，请联系客服获取帮助。</p>
  `;
  showModal('使用帮助', content);
}

// 错误处理
window.addEventListener('error', (event) => {
  console.error('页面错误:', event.error);
  showError('页面出现错误，请刷新重试');
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('未处理的Promise拒绝:', event.reason);
  showError('请求处理失败，请重试');
});

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initializePage);

// 页面卸载时清理
window.addEventListener('beforeunload', () => {
  stopSessionCheck();
});