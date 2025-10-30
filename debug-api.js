#!/usr/bin/env node

// API连接调试脚本
console.log('🔍 开始API连接调试...\n');

// 测试后端API连通性
async function testBackendAPI() {
    try {
        console.log('1. 测试后端健康检查...');
        const healthResponse = await fetch('http://localhost:3002/health');
        const healthData = await healthResponse.json();

        console.log('✅ 后端健康检查成功:');
        console.log('   状态:', healthData.status);
        console.log('   版本:', healthData.version);
        console.log('   环境:', healthData.environment);
        console.log('   会话数:', healthData.sessions.active);
        console.log('');

        return true;
    } catch (error) {
        console.log('❌ 后端健康检查失败:', error.message);
        return false;
    }
}

// 测试教程API
async function testTutorialAPI() {
    try {
        console.log('2. 测试教程概要API...');
        const tutorialResponse = await fetch('http://localhost:3002/api/tutorial/overview');
        const tutorialData = await tutorialResponse.json();

        console.log('✅ 教程API成功:');
        console.log('   标题:', tutorialData.data.title);
        console.log('   章节数:', tutorialData.data.sections.length);
        console.log('');

        return true;
    } catch (error) {
        console.log('❌ 教程API失败:', error.message);
        return false;
    }
}

// 测试订单验证API
async function testOrderAPI() {
    try {
        console.log('3. 测试订单验证API...');
        const orderResponse = await fetch('http://localhost:3002/api/verify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                orderNumber: 'P' + Math.random().toString().substr(2, 18)
            })
        });
        const orderData = await orderResponse.json();

        console.log('✅ 订单验证API响应:');
        console.log('   成功:', orderData.success);
        console.log('   消息:', orderData.message);
        if (orderData.sessionId) {
            console.log('   会话ID:', orderData.sessionId.substring(0, 8) + '...');
        }
        console.log('');

        return true;
    } catch (error) {
        console.log('❌ 订单验证API失败:', error.message);
        return false;
    }
}

// 测试前端服务器
async function testFrontendServer() {
    try {
        console.log('4. 测试前端服务器...');
        const frontendResponse = await fetch('http://localhost:8080/');
        const frontendText = await frontendResponse.text();

        console.log('✅ 前端服务器响应正常:');
        console.log('   状态码:', frontendResponse.status);
        console.log('   包含标题:', frontendText.includes('Apple ID 登录教程'));
        console.log('');

        return true;
    } catch (error) {
        console.log('❌ 前端服务器测试失败:', error.message);
        return false;
    }
}

// 主测试函数
async function runTests() {
    console.log('🚀 开始前后端分离连接测试\n');

    const results = [];

    results.push(await testBackendAPI());
    results.push(await testTutorialAPI());
    results.push(await testOrderAPI());
    results.push(await testFrontendServer());

    const passedTests = results.filter(r => r).length;
    const totalTests = results.length;

    console.log('📊 测试结果汇总:');
    console.log(`   通过: ${passedTests}/${totalTests}`);

    if (passedTests === totalTests) {
        console.log('🎉 所有测试通过！前后端分离系统运行正常！');
        console.log('\n📱 访问地址:');
        console.log('   前端应用: http://localhost:8080/');
        console.log('   后端API: http://localhost:3002/');
        console.log('   测试页面: http://localhost:8080/test-connection.html');
    } else {
        console.log('⚠️  部分测试失败，请检查服务器状态');
    }
}

// 运行测试
runTests().catch(console.error);