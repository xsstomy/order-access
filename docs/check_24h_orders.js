#!/usr/bin/env node

/**
 * 查看当前有24小时限制的订单
 * 这个脚本会显示所有设置了24小时访问窗口期的订单信息
 */

const dbManager = require('../src/config/database');

async function check24HourOrders() {
  console.log('🔍 查看当前有24小时限制的订单');
  console.log('================================\n');

  try {
    // 连接数据库
    await dbManager.connect();
    console.log('✅ 数据库连接成功\n');

    // 查询所有24小时窗口期记录
    const query = `
      SELECT
        oaw.order_number,
        oaw.order_type,
        oaw.first_accessed_at,
        oaw.expires_at,
        oaw.created_at,
        CASE
          WHEN datetime('now') > oaw.expires_at THEN '已过期'
          WHEN datetime('now') < oaw.first_accessed_at THEN '未激活'
          ELSE '有效期内'
        END as status,
        CASE
          WHEN datetime('now') > oaw.expires_at THEN 0
          ELSE ROUND((julianday(oaw.expires_at) - julianday('now')) * 24, 1)
        END as remaining_hours
      FROM order_access_windows oaw
      ORDER BY
        oaw.order_type,
        oaw.created_at DESC
    `;

    const records = await dbManager.all(query);

    if (records.length === 0) {
      console.log('🎉 当前没有任何订单设置了24小时限制');
      await dbManager.close();
      return;
    }

    // 按订单类型分组显示
    const singleOrders = records.filter(r => r.order_type === 'single');
    const multiOrders = records.filter(r => r.order_type === 'multi');

    console.log(`📊 总共找到 ${records.length} 个设置了24小时限制的订单:\n`);

    // 显示多次订单（问题所在）
    if (multiOrders.length > 0) {
      console.log('⚠️  多次订单 (需要清理):');
      console.log('   这些订单不应该有24小时限制！');
      console.log('─'.repeat(80));
      multiOrders.forEach((record, index) => {
        const statusIcon = record.status === '已过期' ? '❌' :
                          record.status === '有效期内' ? '⏰' : '⏸️';

        console.log(`${index + 1}. ${statusIcon} 订单: ${record.order_number}`);
        console.log(`   状态: ${record.status}`);
        console.log(`   首次访问: ${record.first_accessed_at}`);
        console.log(`   过期时间: ${record.expires_at}`);
        console.log(`   剩余时间: ${record.remaining_hours} 小时`);
        console.log('');
      });
    }

    // 显示单次订单（正常）
    if (singleOrders.length > 0) {
      console.log('✅ 单次订单 (正常情况):');
      console.log('   这些订单应该有24小时限制');
      console.log('─'.repeat(80));
      singleOrders.forEach((record, index) => {
        const statusIcon = record.status === '已过期' ? '❌' :
                          record.status === '有效期内' ? '✅' : '⏸️';

        console.log(`${index + 1}. ${statusIcon} 订单: ${record.order_number}`);
        console.log(`   状态: ${record.status}`);
        console.log(`   首次访问: ${record.first_accessed_at}`);
        console.log(`   过期时间: ${record.expires_at}`);
        console.log(`   剩余时间: ${record.remaining_hours} 小时`);
        console.log('');
      });
    }

    // 统计信息
    console.log('📈 统计信息:');
    console.log(`   单次订单: ${singleOrders.length} 个`);
    console.log(`   多次订单: ${multiOrders.length} 个 ⚠️`);
    console.log(`   总计: ${records.length} 个`);

    if (multiOrders.length > 0) {
      console.log('\n💡 建议:');
      console.log('   运行清理命令: node clean_multi_order_windows.js');
      console.log('   或一键执行: ./cleanup_multi_orders.sh');
    }

    // 关闭数据库连接
    await dbManager.close();

  } catch (error) {
    console.error('❌ 查询过程中发生错误:', error);
    if (dbManager.db) {
      await dbManager.close();
    }
    process.exit(1);
  }
}

// 显示帮助信息
function showHelp() {
  console.log(`
📖 使用说明:
  node check_24h_orders.js          # 查看所有24小时限制订单
  node check_24h_orders.js --help   # 显示帮助信息

🔍 查看内容:
  - 所有设置了24小时访问窗口期的订单
  - 订单状态（已过期/有效期内/未激活）
  - 剩余时间
  - 区分单次订单和多次订单

⚠️  特别注意:
  - 多次订单显示为 ⚠️ 警告状态
  - 这些记录应该被清理
  - 单次订单显示为 ✅ 正常状态
  `);
}

// 检查命令行参数
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showHelp();
  process.exit(0);
}

// 执行查询
if (require.main === module) {
  check24HourOrders();
}

module.exports = check24HourOrders;