#!/usr/bin/env node

/**
 * 快速查看24小时限制订单统计
 */

const dbManager = require('../src/config/database');

async function quickCheck() {
  try {
    await dbManager.connect();

    const singleCount = await dbManager.get("SELECT COUNT(*) as count FROM order_access_windows WHERE order_type = 'single'");
    const multiCount = await dbManager.get("SELECT COUNT(*) as count FROM order_access_windows WHERE order_type = 'multi'");

    console.log('🔍 24小时限制订单统计:');
    console.log(`   单次订单: ${singleCount.count} 个 ✅`);
    console.log(`   多次订单: ${multiCount.count} 个 ${multiCount.count > 0 ? '⚠️' : '✅'}`);
    console.log(`   总计: ${singleCount.count + multiCount.count} 个`);

    if (multiCount.count > 0) {
      console.log('\n⚠️  发现问题: 多次订单不应该有24小时限制！');
      console.log('   建议运行: node check_24h_orders.js 查看详情');
      console.log('   或运行: ./cleanup_multi_orders.sh 进行清理');
    }

    await dbManager.close();
  } catch (error) {
    console.error('❌ 查询失败:', error.message);
  }
}

if (require.main === module) {
  quickCheck();
}