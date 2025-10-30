// 判断是否 iOS WebKit（iPhone/iPad 上的 Safari/内嵌 WebView）
function isIOSWebKit() {
    const ua = navigator.userAgent;
    const isIOS = /iP(ad|hone|od)/.test(ua);
    const isWebKit = /WebKit/.test(ua) && !/CriOS|FxiOS|OPiOS/.test(ua);
    return isIOS && isWebKit;
}

// 回退到 execCommand(copy)
function fallbackCopy(text) {
    // 用不可见 textarea，display:none 会导致无法选中，改用移出视口
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    ta.style.left = "-1000px";
    ta.style.opacity = "0";
    document.body.appendChild(ta);

    let ok = false;
    try {
        ta.select();
        ta.setSelectionRange(0, ta.value.length); // iOS 需要
        ok = document.execCommand("copy");
    } catch (_) {
        ok = false;
    }
    document.body.removeChild(ta);
    return ok;
}

async function copyText(id) {
    const el = document.getElementById(id);
    const text = (el?.innerText || el?.textContent || "").trim();
    if (!text) {
        alert("没有可复制的内容");
        showOverlay();
        return;
    }

    // 1) 首选：安全上下文 + 可用 Clipboard API
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            alert("已复制：" + text);
            showOverlay();
            return;
        }
    } catch (err) {
        // 继续走回退
    }

    // 2) 回退：execCommand('copy')
    try {
        const ok = fallbackCopy(text);
        if (ok) {
            alert("已复制：" + text);
            showOverlay();
            return;
        }
    } catch (_) {
        // 继续走最后兜底
    }

    // 3) 兜底：提示用户手动复制（对 iOS 体验更友好）
    if (isIOSWebKit()) {
        // iOS 上提供一个可编辑输入框以便长按选择
        const input = document.createElement("input");
        input.value = text;
        input.readOnly = true;
        input.style.position = "fixed";
        input.style.top = "-1000px";
        input.style.left = "-1000px";
        document.body.appendChild(input);
        input.select();
        input.setSelectionRange(0, input.value.length);
        // 弹提示让用户长按粘贴
        alert("复制失败，请长按输入框或使用系统选择操作进行复制：\n" + text);
        document.body.removeChild(input);
    } else {
        // 非 iOS 用 prompt 兜底
        window.prompt("复制失败，请使用 Ctrl/Cmd+C 复制以下内容：", text);
    }

    showOverlay();
}

// 账号配置
let accounts = [
    {
        account: "bigt0ny0001@hotmail.com",
        password: "Bb334455@",
    },
    {
        account: "orlakocakp6893@hotmail.com",
        password: "Aa251019Ah",
    },
];
let currentIndex = 1;

// 加载账号配置
//   fetch('./accounts.json')
//     .then(res => res.json())
//     .then(data => {
//       accounts = data.data || [];

//       console.log(" currentIndex "+ data.currentIndex);

//       currentIndex = typeof data.currentIndex === 'number' ? data.currentIndex : 0;
//       setAccount(currentIndex); // 默认显示 currentIndex 指定的账号
//     });

setAccount(currentIndex);

// 根据索引设置账号和密码
function setAccount(index) {
    if (!accounts.length) return;
    if (typeof index !== "number" || index < 0 || index >= accounts.length) {
        index = 0;
    }
    const accountEl = document.getElementById("account");
    const passwordEl = document.getElementById("password");
    accountEl.innerText = accounts[index].account;
    passwordEl.innerText = accounts[index].password;
}

// // 滚动监听显示横幅
// window.addEventListener('scroll', function () {
//   const step2 = document.getElementById('step2');
//   const banner = document.getElementById('sticky-banner');

//   if (!step2 || !banner) return;

//   const rect = step2.getBoundingClientRect();

//   // 条件说明：
//   // 当 step2 的顶部在视口内（也就是已经滚动到第 2 步）
//   if (rect.top < window.innerHeight ) {
//     banner.style.display = 'block';
//   } else {
//     banner.style.display = 'none';
//   }
// });

// 覆盖层控制
let overlayDismissed = false;

function dismissOverlay() {
    if (overlayDismissed) return;
    overlayDismissed = true;

    // 隐藏遮罩
    const overlay = document.getElementById("fullscreen-overlay");
    if (overlay) {
        overlay.classList.remove("show");
    }

    // 显示步骤按钮
    const buttons = document.getElementById("step-buttons");
    if (buttons) {
        buttons.classList.remove("hidden-buttons");
    }
}

// 显示遮罩
function showOverlay() {
    // 显示遮罩
    const overlay = document.getElementById("fullscreen-overlay");
    if (overlay) {
        overlay.classList.add("show");
    }

    // 隐藏右上角按钮（可选）
    const buttons = document.getElementById("step-buttons");
    if (buttons) {
        buttons.classList.add("hidden-buttons");
    }

    // 标记为未关闭
    overlayDismissed = false;
}

// 点击遮罩时隐藏
document
    .getElementById("go-on-button")
    .addEventListener("click", dismissOverlay);

// 添加复制按钮事件监听器和初始化覆盖层状态
document.addEventListener("DOMContentLoaded", function () {
    // 初始化时确保覆盖层隐藏
    overlayDismissed = false;
    const overlay = document.getElementById("fullscreen-overlay");
    if (overlay) {
        overlay.classList.remove("show");
    }

    const copyAccountBtn = document.getElementById("copyAccountBtn");
    const copyPasswordBtn = document.getElementById("copyPasswordBtn");

    if (copyAccountBtn) {
        copyAccountBtn.addEventListener("click", function () {
            copyText("account");
        });
    }

    if (copyPasswordBtn) {
        copyPasswordBtn.addEventListener("click", function () {
            copyText("password");
        });
    }
});

dismissOverlay();

// 延迟一段时间再绑定 scroll 监听器，防止锚点跳转误触发
// setTimeout(() => {
//   let hasScrolled = false;
//   window.addEventListener('scroll', function onScroll() {
//     if (overlayDismissed || hasScrolled) return;
//     hasScrolled = true;

//     // 真正用户滑动之后再触发遮罩隐藏
//     dismissOverlay();

//     // 可选：移除监听器（只触发一次）
//     window.removeEventListener('scroll', onScroll);
//   });
// }, 1000); // 延迟 1 秒钟再绑定 scroll

// ==============================================
// 订单验证系统 JavaScript
// ==============================================

// 验证相关的全局变量
let currentSessionId = null;
let sessionCheckInterval = null;
let sessionEndTime = null;

// DOM 元素
const verificationElements = {
    verificationOverlay: document.getElementById("verificationOverlay"),
    verificationForm: document.getElementById("verificationForm"),
    orderNumberInput: document.getElementById("orderNumber"),
    submitBtn: document.getElementById("submitBtn"),
    btnText: document.querySelector(".btn-text"),
    btnLoading: document.querySelector(".btn-loading"),
    errorMessage: document.getElementById("errorMessage"),
    successMessage: document.getElementById("successMessage"),
    errorText: document.querySelector(".error-message .message-text"),
    successText: document.querySelector(".success-message .message-text"),
    verificationStatus: document.getElementById("verificationStatus"),
    sessionTimer: document.getElementById("sessionTimer"),
    logoutBtn: document.getElementById("logoutBtn"),
    refreshSessionBtn: document.getElementById("refreshSessionBtn"),
    tutorialContent: document.querySelector(".container"),
};

// 验证状态管理
function showLoading(isLoading) {
    if (isLoading) {
        verificationElements.submitBtn.disabled = true;
        verificationElements.btnText.style.display = "none";
        verificationElements.btnLoading.style.display = "inline-flex";
    } else {
        verificationElements.submitBtn.disabled = false;
        verificationElements.btnText.style.display = "inline";
        verificationElements.btnLoading.style.display = "none";
    }
}

function hideMessages() {
    verificationElements.errorMessage.style.display = "none";
    verificationElements.successMessage.style.display = "none";
}

function showError(message) {
    hideMessages();
    verificationElements.errorText.textContent = message;
    verificationElements.errorMessage.style.display = "flex";
}

function showSuccess(message) {
    hideMessages();
    verificationElements.successText.textContent = message;
    verificationElements.successMessage.style.display = "flex";
}

function showVerificationOverlay() {
    verificationElements.verificationOverlay.style.display = "flex";
    document.body.style.overflow = "hidden"; // 禁止滚动
    verificationElements.verificationStatus.style.display = "none";
}

function hideVerificationOverlay() {
    verificationElements.verificationOverlay.style.display = "none";
    document.body.style.overflow = ""; // 恢复滚动
    verificationElements.verificationStatus.style.display = "flex";
}

// 验证订单号
async function verifyOrder(orderNumber) {
    try {
        const response = await fetch("/api/verify", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ orderNumber }),
        });

        const result = await response.json();

        if (result.success) {
            currentSessionId = result.sessionId;
            sessionEndTime = new Date(result.sessionExpiresAt);
            showSuccess("验证成功！正在跳转...");

            setTimeout(() => {
                hideVerificationOverlay();
                startSessionTimer();
                dismissOverlay(); // 关闭原有的教程提示覆盖层
            }, 1500);
        } else {
            showError(result.message || "订单号无效或已过期");
        }
    } catch (error) {
        console.error("验证请求失败:", error);
        showError("网络错误，请稍后重试");
    }
}

// 会话管理
function startSessionTimer() {
    if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval);
    }

    updateSessionTimer();
    sessionCheckInterval = setInterval(updateSessionTimer, 1000);
}

function updateSessionTimer() {
    if (!sessionEndTime) return;

    const now = new Date();
    const remaining = sessionEndTime - now;

    if (remaining <= 0) {
        handleSessionExpired();
        return;
    }

    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

    let timeText = "";
    if (hours > 0) {
        timeText = `${hours}小时${minutes}分`;
    } else if (minutes > 0) {
        timeText = `${minutes}分${seconds}秒`;
    } else {
        timeText = `${seconds}秒`;
    }

    verificationElements.sessionTimer.textContent = `剩余: ${timeText}`;
}

function handleSessionExpired() {
    if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval);
    }
    currentSessionId = null;
    sessionEndTime = null;
    showVerificationOverlay();
    showError("会话已过期，请重新验证订单号");
}

// 检查会话状态
async function checkSessionStatus() {
    try {
        const response = await fetch("/api/verify/status", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });

        const result = await response.json();

        if (result.success && result.valid) {
            currentSessionId = result.sessionId;
            sessionEndTime = new Date(result.sessionExpiresAt);
            hideVerificationOverlay();
            startSessionTimer();
            dismissOverlay(); // 关闭教程提示覆盖层
        } else {
            showVerificationOverlay();
        }
    } catch (error) {
        console.error("检查会话状态失败:", error);
        showVerificationOverlay();
    }
}

// 刷新会话
async function refreshSession() {
    try {
        const response = await fetch("/api/verify/refresh", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
        });

        const result = await response.json();

        if (result.success) {
            sessionEndTime = new Date(result.sessionExpiresAt);
            showSuccess("会话已刷新");
            setTimeout(hideMessages, 2000);
        } else {
            showError(result.message || "刷新会话失败");
        }
    } catch (error) {
        console.error("刷新会话失败:", error);
        showError("网络错误，请稍后重试");
    }
}

// 退出登录
async function logout() {
    try {
        await fetch("/api/verify/logout", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
        });
    } catch (error) {
        console.error("退出登录失败:", error);
    } finally {
        if (sessionCheckInterval) {
            clearInterval(sessionCheckInterval);
        }
        currentSessionId = null;
        sessionEndTime = null;
        showVerificationOverlay();
    }
}

// 事件监听器
verificationElements.verificationForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const orderNumber = verificationElements.orderNumberInput.value.trim();

    if (!orderNumber) {
        showError("请输入订单号");
        return;
    }

    showLoading(true);
    hideMessages();

    await verifyOrder(orderNumber);

    showLoading(false);
});

verificationElements.logoutBtn.addEventListener("click", logout);
verificationElements.refreshSessionBtn.addEventListener(
    "click",
    refreshSession
);

// 输入框焦点事件
verificationElements.orderNumberInput.addEventListener("focus", hideMessages);
verificationElements.orderNumberInput.addEventListener("input", hideMessages);

// 初始化验证系统
function initVerificationSystem() {
    console.log("🚀 初始化验证系统");

    // 检查URL中是否有订单号参数
    const urlParams = new URLSearchParams(window.location.search);
    const orderNumber = urlParams.get("orderNumber");

    if (orderNumber && orderNumber.trim()) {
        // 如果URL中有订单号，自动填充并尝试验证
        verificationElements.orderNumberInput.value = orderNumber.trim();
        // 延迟一点再自动验证，确保页面完全加载
        setTimeout(() => {
            verificationElements.verificationForm.dispatchEvent(
                new Event("submit")
            );
        }, 500);
    } else {
        // 检查会话状态
        checkSessionStatus();
    }
}

// 页面加载完成后初始化
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initVerificationSystem);
} else {
    initVerificationSystem();
}
