// 多次订单专用验证逻辑
// 基于 app.js，但增加了订单类型检查，只允许多次订单通过验证

// 导入原有的API和UI模块（它们已经在页面中加载）

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
document.addEventListener("DOMContentLoaded", () => {
    const goOnButton = document.getElementById("go-on-button");
    if (goOnButton) {
        goOnButton.addEventListener("click", dismissOverlay);
    }
});

// 加载教程内容（占位函数，实际使用时会从原app.js调用）
function loadTutorialContent() {
    console.log("Tutorial content loaded");
}
class MultiOrderVerification {
    constructor() {
        this.verificationElements = {
            verificationOverlay: document.getElementById("verificationOverlay"),
            verificationForm: document.getElementById("verificationForm"),
            orderNumberInput: document.getElementById("orderNumber"),
            submitBtn: document.getElementById("submitBtn"),
            errorMessage: document.getElementById("errorMessage"),
            successMessage: document.getElementById("successMessage"),
            logoutBtn: document.getElementById("logoutBtn"),
            refreshSessionBtn: document.getElementById("refreshSessionBtn"),
        };
    }

    // 多次订单专用验证函数
    async verifyOrder(orderNumber) {
        try {
            uiManager.showLoading("submitBtn", true);
            uiManager.hideMessages();

            const result = await api.verifyOrder(orderNumber);

            if (result.success) {
                // 验证成功后，检查订单类型是否为多次订单
                try {
                    // 使用 window 端点检查订单类型
                    const orderTypeResult = await this.checkOrderType(
                        orderNumber
                    );

                    if (
                        orderTypeResult.success &&
                        orderTypeResult.orderType === "multi"
                    ) {
                        uiManager.showMessage(
                            "success",
                            "多次订单验证成功！正在跳转..."
                        );

                        // 更新UI状态
                        if (result.sessionId) {
                            const sessionData = {
                                sessionId: result.sessionId,
                                orderNumber: orderNumber,
                                expiresAt: new Date(result.sessionExpiresAt),
                                remainingTime:
                                    new Date(result.sessionExpiresAt) -
                                    new Date(),
                            };
                            uiManager.updateSessionStatus(sessionData);
                        }

                        setTimeout(() => {
                            uiManager.hideVerificationOverlay();
                            if (typeof dismissOverlay === "function") {
                                dismissOverlay(); // 关闭原有的教程提示覆盖层
                            }
                            if (typeof loadTutorialContent === "function") {
                                loadTutorialContent(); // 加载教程内容
                            }
                        }, 1500);
                    } else {
                        // 订单不是多次订单，显示专用错误消息
                        uiManager.showMessage(
                            "error",
                            "此页面仅支持多次订单验证，请联系客服获取多次订单权限"
                        );
                        console.warn(
                            `非多次订单尝试访问多次订单专用页面: ${orderNumber}, 类型: ${
                                orderTypeResult.orderType || "unknown"
                            }`
                        );

                        // 清除已创建的会话，因为不应该允许访问
                        await api.logout();
                    }
                } catch (typeCheckError) {
                    console.error("检查订单类型失败:", typeCheckError);
                    uiManager.showMessage(
                        "error",
                        "订单类型验证失败，请稍后重试"
                    );

                    // 清除已创建的会话
                    await api.logout();
                }
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

    // 检查订单类型的辅助方法
    async checkOrderType(orderNumber) {
        const response = await fetch(
            `${api.baseURL}/api/verify/window/${orderNumber}`
        );
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || `HTTP ${response.status}`);
        }

        return data;
    }

    // 检查会话状态
    async checkSessionStatus() {
        try {
            const result = await api.checkSessionStatus();

            if (result.success && result.authenticated && result.data) {
                uiManager.hideVerificationOverlay();
                // 立即更新会话状态 - 修复：确保会话状态显示正确
                uiManager.updateSessionStatus({
                    sessionId: result.data.sessionId,
                    orderNumber: result.data.orderNumber,
                    expiresAt: new Date(result.data.expiresAt),
                    remainingTime: result.data.remainingTime,
                });

                if (typeof dismissOverlay === "function") {
                    dismissOverlay();
                }
                if (typeof loadTutorialContent === "function") {
                    loadTutorialContent();
                }
            } else {
                // 没有有效会话，显示验证表单
                uiManager.showVerificationOverlay();
            }
        } catch (error) {
            console.error("检查会话状态失败:", error);
            uiManager.showVerificationOverlay();
        }
    }

    // 初始化事件监听器
    initializeEventListeners() {
        // 验证表单提交
        if (this.verificationElements.verificationForm) {
            this.verificationElements.verificationForm.addEventListener(
                "submit",
                async (e) => {
                    e.preventDefault();
                    const orderNumber =
                        this.verificationElements.orderNumberInput.value.trim();
                    if (orderNumber) {
                        await this.verifyOrder(orderNumber);
                    }
                }
            );
        }

        // 复制账号密码按钮事件
        const copyAccountBtn = document.getElementById("copyAccountBtn");
        if (copyAccountBtn) {
            copyAccountBtn.addEventListener("click", () => copyText("account"));
        }

        const copyPasswordBtn = document.getElementById("copyPasswordBtn");
        if (copyPasswordBtn) {
            copyPasswordBtn.addEventListener("click", () =>
                copyText("password")
            );
        }

        // 退出登录
        if (this.verificationElements.logoutBtn) {
            this.verificationElements.logoutBtn.addEventListener(
                "click",
                async () => {
                    try {
                        await api.logout();
                        uiManager.showVerificationOverlay();
                        uiManager.showMessage("success", "已安全退出");
                    } catch (error) {
                        console.error("退出登录失败:", error);
                        uiManager.showMessage("error", "退出失败，请稍后重试");
                    }
                }
            );
        }

        // 刷新会话
        if (this.verificationElements.refreshSessionBtn) {
            this.verificationElements.refreshSessionBtn.addEventListener(
                "click",
                async () => {
                    try {
                        const result = await api.refreshSession();
                        if (result.success) {
                            const sessionData = {
                                sessionId: result.sessionId,
                                orderNumber: result.orderNumber,
                                expiresAt: new Date(result.sessionExpiresAt),
                                remainingTime:
                                    new Date(result.sessionExpiresAt) -
                                    new Date(),
                            };
                            uiManager.updateSessionStatus(sessionData);
                            uiManager.showMessage("success", "会话已刷新");
                        }
                    } catch (error) {
                        console.error("刷新会话失败:", error);
                        uiManager.showMessage("error", "刷新失败，请稍后重试");
                    }
                }
            );
        }

        // 输入框事件
        if (this.verificationElements.orderNumberInput) {
            this.verificationElements.orderNumberInput.addEventListener(
                "focus",
                () => uiManager.hideMessages()
            );
            this.verificationElements.orderNumberInput.addEventListener(
                "input",
                () => uiManager.hideMessages()
            );
        }
    }

    // 初始化
    init() {
        this.initializeEventListeners();
    }

    // 初始化验证系统 - 修复：添加正确的初始化逻辑
    async initVerificationSystem() {
        console.log("🚀 初始化多次订单验证系统");

        // 检查URL中是否有订单号参数
        const urlParams = new URLSearchParams(window.location.search);
        const orderNumber = urlParams.get("order");

        if (orderNumber && orderNumber.trim()) {
            // 如果URL中有订单号，自动填充并尝试验证
            this.verificationElements.orderNumberInput.value =
                orderNumber.trim();
            // 延迟一点再自动验证，确保页面完全加载
            setTimeout(() => {
                this.verificationElements.verificationForm.dispatchEvent(
                    new Event("submit")
                );
            }, 500);
        } else {
            // 检查会话状态
            await this.checkSessionStatus();
        }
    }
}

// 创建多次订单验证实例
const multiOrderVerification = new MultiOrderVerification();

// 页面加载完成后初始化 - 修复：使用正确的初始化逻辑
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
        multiOrderVerification.init();
        multiOrderVerification.initVerificationSystem();
    });
} else {
    multiOrderVerification.init();
    multiOrderVerification.initVerificationSystem();
}

// 导出到全局作用域（如果需要）
window.multiOrderVerification = multiOrderVerification;
