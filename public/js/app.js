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
// 前后端分离版本 - 订单验证系统
// ==============================================

// DOM 元素
const verificationElements = {
    verificationOverlay: document.getElementById("verificationOverlay"),
    verificationForm: document.getElementById("verificationForm"),
    orderNumberInput: document.getElementById("orderNumber"),
    submitBtn: document.getElementById("submitBtn"),
    logoutBtn: document.getElementById("logoutBtn"),
    refreshSessionBtn: document.getElementById("refreshSessionBtn"),
};

// 验证订单号 - 使用新的API模块
async function verifyOrder(orderNumber) {
    try {
        uiManager.showLoading("submitBtn", true);
        uiManager.hideMessages();

        const result = await api.verifyOrder(orderNumber);

        if (result.success) {
            uiManager.showMessage("success", "验证成功！正在跳转...");

            // 更新UI状态
            if (result.sessionId) {
                const sessionData = {
                    sessionId: result.sessionId,
                    orderNumber: orderNumber,
                    expiresAt: new Date(result.sessionExpiresAt),
                    remainingTime:
                        new Date(result.sessionExpiresAt) - new Date(),
                };
                uiManager.updateSessionStatus(sessionData);
            }

            setTimeout(() => {
                uiManager.hideVerificationOverlay();
                dismissOverlay(); // 关闭原有的教程提示覆盖层
                loadTutorialContent(); // 加载教程内容
            }, 1500);
        } else {
            uiManager.showMessage(
                "error",
                result.message || "订单号无效或已过期"
            );
        }
    } catch (error) {
        console.error("验证请求失败:", error);
        uiManager.showMessage("error", "访问频繁，请稍后重试");
    } finally {
        uiManager.showLoading("submitBtn", false);
    }
}

// 检查会话状态 - 使用新的API模块
async function checkSessionStatus() {
    try {
        const result = await api.checkSessionStatus();

        if (result.success && result.authenticated && result.data) {
            uiManager.hideVerificationOverlay();
            uiManager.updateSessionStatus({
                sessionId: result.data.sessionId,
                orderNumber: result.data.orderNumber,
                expiresAt: new Date(result.data.expiresAt),
                remainingTime: result.data.remainingTime,
            });
            dismissOverlay(); // 关闭教程提示覆盖层
            await loadTutorialContent(); // 加载教程内容
        } else {
            uiManager.showVerificationOverlay();
        }
    } catch (error) {
        console.error("检查会话状态失败:", error);
        uiManager.showVerificationOverlay();
    }
}

// 刷新会话 - 使用新的API模块
async function refreshSession() {
    try {
        const result = await api.refreshSession();

        if (result.success && result.data) {
            uiManager.showMessage("success", "会话已刷新");
            uiManager.updateSessionStatus({
                sessionId: api.getSessionId(),
                expiresAt: new Date(result.data.expiresAt),
                remainingTime: result.data.remainingTime,
            });
            setTimeout(() => uiManager.hideMessages(), 2000);
        } else {
            uiManager.showMessage("error", result.message || "刷新会话失败");
        }
    } catch (error) {
        console.error("刷新会话失败:", error);
        uiManager.showMessage("error", "访问频繁，请稍后重试");
    }
}

// 退出登录 - 使用新的API模块
async function logout() {
    try {
        await api.logout();
    } catch (error) {
        console.error("退出登录失败:", error);
    } finally {
        uiManager.showVerificationOverlay();
    }
}

// 加载教程内容
async function loadTutorialContent() {
    try {
        const tutorialResult = await api.getTutorialContent();
        if (tutorialResult.success && tutorialResult.data) {
            uiManager.updateTutorialContent(tutorialResult.data);

            // 如果有账号信息，更新账号显示
            if (tutorialResult.data.sections) {
                const step2Section = tutorialResult.data.sections.find(
                    (s) => s.id === "step2"
                );
                if (step2Section && step2Section.accounts) {
                    uiManager.updateAccounts(step2Section.accounts);
                }
            }
        }
    } catch (error) {
        console.error("加载教程内容失败:", error);
    }
}

// 事件监听器
function bindEvents() {
    // 验证表单提交
    if (verificationElements.verificationForm) {
        verificationElements.verificationForm.addEventListener(
            "submit",
            async (e) => {
                e.preventDefault();
                const orderNumber =
                    verificationElements.orderNumberInput.value.trim();

                if (!orderNumber) {
                    uiManager.showMessage("error", "请输入订单号");
                    return;
                }

                await verifyOrder(orderNumber);
            }
        );
    }

    // 退出登录
    if (verificationElements.logoutBtn) {
        verificationElements.logoutBtn.addEventListener("click", logout);
    }

    // 刷新会话
    if (verificationElements.refreshSessionBtn) {
        verificationElements.refreshSessionBtn.addEventListener(
            "click",
            refreshSession
        );
    }

    // 输入框焦点事件
    if (verificationElements.orderNumberInput) {
        verificationElements.orderNumberInput.addEventListener("focus", () =>
            uiManager.hideMessages()
        );
        verificationElements.orderNumberInput.addEventListener("input", () =>
            uiManager.hideMessages()
        );
    }
}

// 初始化验证系统
async function initVerificationSystem() {
    console.log("🚀 初始化前后端分离验证系统");

    // 绑定事件
    bindEvents();

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
        await checkSessionStatus();
    }
}

// 页面加载完成后初始化
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initVerificationSystem);
} else {
    initVerificationSystem();
}
