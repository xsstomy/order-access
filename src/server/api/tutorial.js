const express = require('express');
const { sessionManager } = require('../middleware/session');
const { verifyRateLimiter } = require('../middleware/rateLimit');

const router = express.Router();

// 教程内容配置 - 从现有HTML结构中提取
const TUTORIAL_CONTENT = {
  title: "Apple ID 登录教程",
  description: "共4步完整教程，请认真看完",
  sections: [
    {
      id: "warning",
      title: "重要提示",
      content: [
        "教程一共<strong class=\"highlight\"> 4 </strong>步请认真看完，向下滑动即可查看所有内容。",
        "<strong class=\"highlight\">账号在最下方！！</strong> 请耐心看完教程！！",
        "只登录appstore下载安装，不涉及任何隐私和安全问题，请放心使用",
        "<strong>✅ 请在 App Store 使用</strong>，<strong>❌❌严禁在设置和icould登录此id，严禁用此id充值/改地区。</strong>否则出现问题概不负责。"
      ],
      images: [
        { src: "./textimage/step0.png", alt: "第一步截图" }
      ]
    },
    {
      id: "step1",
      title: "第 1 步：退出账号",
      content: [
        "打开 App Store，点击右上角头像，<span class=\"highlight\">滑到底部找到\"退出登录\"</span>。"
      ],
      images: [
        { src: "./textimage/step1.PNG", alt: "第二步截图" }
      ]
    },
    {
      id: "step2",
      title: "第 2 步：登录账号，下载应用",
      content: [
        "点击\"通过 Apple ID 登录\" → 点击不是 → 输入账号 → 点击\"继续输入密码\"。<span class=\"highlight\">继续下滑可以看到点我复制账号和密码</span>",
        "如果你的设备不是如上图这样的，那么输入账号和密码，点击登录，不要点完成",
        "登录之后苹果商店，<strong class=\"highlight\">跟你平时下载软件一样</strong>，输入 <strong class=\"highlight\">你要下载的软件名字</strong>，即可下载",
        "如果登录后 App Store 搜不到，先关闭 App Store 重新打开再搜。",
        "如果还不行，请联系客服"
      ],
      images: [
        { src: "./textimage/step2.PNG", alt: "第三步截图" }
      ],
      accounts: [
        {
          account: "bigt0ny0001@hotmail.com",
          password: "Bb334455@"
        },
        {
          account: "orlakocakp6893@hotmail.com",
          password: "Aa251019Ah"
        }
      ]
    },
    {
      id: "step3",
      title: "第 3 步：登录回自己的账号",
      content: [
        "点击 \"appstore\" → 点击右上角\"账号\" →下滑到底部，点击\"退出登录\" → 滑到顶部，点击\"通过 apple 账户登录\"  → 点击\"继续\"。",
        "按照上面的路径操作即可登录回你自己的账号，<strong class=\"highlight\">退出我的账号不影响应用使用</strong>"
      ],
      importantTips: [
        "📌 下载后请立即退出账号！！",
        "📌 下载后请立即退出账号！！"
      ],
      images: [
        { src: "./textimage/backselfaccount.png", alt: "第三步截图" }
      ]
    },
    {
      id: "step4",
      title: "第 4 步：遇到无法更新的情况，执行第 4步",
      content: [
        "点击\"设置\" → 通用 →点击 \"iPhone存储空间\" → 找到<span class=\"highlight\">\"要更新的应用或游戏\"</span> → 卸载 app",
        "下载时不需要操作这一步，仅在无法更新时再来执行。"
      ],
      images: [
        { src: "./textimage/delete.png", alt: "第一步截图" }
      ]
    }
  ]
};

// 验证会话中间件
const requireValidSession = (req, res, next) => {
  const sessionId = req.headers['x-session-id'] || req.query.sessionId;
  const clientIP = req.ip || req.connection.remoteAddress;

  if (!sessionId) {
    return res.json({
      success: false,
      message: '未提供会话ID'
    });
  }

  if (!sessionManager.validateSession(sessionId, clientIP)) {
    return res.json({
      success: false,
      message: '会话无效或已过期'
    });
  }

  req.session = sessionManager.getSession(sessionId);
  next();
};

// 获取教程内容 (需要有效会话)
router.get('/content', requireValidSession, (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        ...TUTORIAL_CONTENT,
        // 添加当前会话信息
        sessionInfo: {
          orderNumber: req.session.orderNumber,
          createdAt: req.session.createdAt,
          lastAccessedAt: req.session.lastAccessedAt
        }
      }
    });
  } catch (error) {
    console.error('获取教程内容错误:', error);
    res.json({
      success: false,
      message: '获取教程内容失败'
    });
  }
});

// 获取教程概要 (公开信息，用于预览)
router.get('/overview', (req, res) => {
  try {
    const overview = {
      title: TUTORIAL_CONTENT.title,
      description: TUTORIAL_CONTENT.description,
      sections: TUTORIAL_CONTENT.sections.map(section => ({
        id: section.id,
        title: section.title,
        contentLength: section.content.length,
        hasImages: section.images && section.images.length > 0,
        hasAccounts: section.accounts && section.accounts.length > 0
      }))
    };

    res.json({
      success: true,
      data: overview
    });
  } catch (error) {
    console.error('获取教程概要错误:', error);
    res.json({
      success: false,
      message: '获取教程概要失败'
    });
  }
});

// 获取特定章节内容
router.get('/sections/:sectionId', requireValidSession, (req, res) => {
  try {
    const { sectionId } = req.params;
    const section = TUTORIAL_CONTENT.sections.find(s => s.id === sectionId);

    if (!section) {
      return res.json({
        success: false,
        message: '章节不存在'
      });
    }

    res.json({
      success: true,
      data: section
    });
  } catch (error) {
    console.error('获取章节内容错误:', error);
    res.json({
      success: false,
      message: '获取章节内容失败'
    });
  }
});

// 获取账号信息 (需要有效会话)
router.get('/accounts', requireValidSession, (req, res) => {
  try {
    // 从第2步获取账号信息
    const step2Section = TUTORIAL_CONTENT.sections.find(s => s.id === 'step2');

    if (!step2Section || !step2Section.accounts) {
      return res.json({
        success: false,
        message: '账号信息不可用'
      });
    }

    res.json({
      success: true,
      data: {
        accounts: step2Section.accounts,
        currentAccountIndex: 0 // 可以根据业务逻辑调整
      }
    });
  } catch (error) {
    console.error('获取账号信息错误:', error);
    res.json({
      success: false,
      message: '获取账号信息失败'
    });
  }
});

// 教程搜索功能
router.get('/search', requireValidSession, (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.json({
        success: false,
        message: '搜索关键词至少需要2个字符'
      });
    }

    const keyword = q.trim().toLowerCase();
    const results = [];

    TUTORIAL_CONTENT.sections.forEach(section => {
      const matches = [];

      // 搜索标题
      if (section.title.toLowerCase().includes(keyword)) {
        matches.push({
          type: 'title',
          text: section.title,
          sectionId: section.id
        });
      }

      // 搜索内容
      section.content.forEach((content, index) => {
        if (content.toLowerCase().includes(keyword)) {
          matches.push({
            type: 'content',
            text: content,
            sectionId: section.id,
            contentIndex: index
          });
        }
      });

      if (matches.length > 0) {
        results.push({
          sectionId: section.id,
          sectionTitle: section.title,
          matches
        });
      }
    });

    res.json({
      success: true,
      data: {
        keyword,
        results,
        totalMatches: results.reduce((total, section) => total + section.matches.length, 0)
      }
    });
  } catch (error) {
    console.error('教程搜索错误:', error);
    res.json({
      success: false,
      message: '搜索失败'
    });
  }
});

module.exports = router;