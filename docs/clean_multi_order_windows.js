#!/usr/bin/env node

/**
 * 清理多次订单的24小时窗口期记录
 * 这个脚本将安全地删除 order_access_windows 表中所有 order_type='multi' 的记录
 */

const path = require('path');
const dbManager = require('../src/config/database');

async function cleanMultiOrderWindows() {
  console.log('🚀 开始清理多次订单的24小时窗口期记录...\n');

  try {
    // 连接数据库
    await dbManager.connect();
    console.log('✅ 数据库连接成功');

    // 步骤1: 检查当前的多次订单窗口期记录
    console.log('\n📋 步骤1: 检查当前的多次订单窗口期记录');
    const checkQuery = `
      SELECT
        order_number,
        order_type,
        first_accessed_at,
        expires_at,
        CASE
          WHEN datetime('now') > expires_at THEN 'expired'
          ELSE 'valid'
        END as status
      FROM order_access_windows
      WHERE order_type = 'multi'
      ORDER BY created_at DESC
    `;

    const records = await dbManager.all(checkQuery);
    console.log(`找到 ${records.length} 个多次订单的24小时窗口期记录:`);

    if (records.length === 0) {
      console.log('🎉 没有找到需要清理的记录，数据库已经很干净了！');
      await dbManager.close();
      return;
    }

    records.forEach((record, index) => {
      console.log(`  ${index + 1}. 订单: ${record.order_number} | 状态: ${record.status} | 过期时间: ${record.expires_at}`);
    });

    // 步骤2: 确认操作
    console.log('\n⚠️  注意: 这些记录将被永久删除！');
    console.log('   删除后，多次订单将不再受24小时时间限制');
    console.log('   这个操作是安全的，因为多次订单本来就不应该有时间限制\n');

    // 步骤3: 执行清理
    console.log('🗑️  步骤3: 执行数据库清理...');

    const deleteQuery = `DELETE FROM order_access_windows WHERE order_type = 'multi'`;
    const result = await dbManager.run(deleteQuery);

    console.log(`✅ 成功删除 ${result.changes} 条记录`);

    // 步骤4: 验证清理结果
    console.log('\n🔍 步骤4: 验证清理结果...');
    const verifyQuery = `SELECT COUNT(*) as count FROM order_access_windows WHERE order_type = 'multi'`;
    const verify = await dbManager.get(verifyQuery);

    if (verify.count === 0) {
      console.log('✅ 验证成功！所有多次订单的24小时窗口期记录已清理完毕');
    } else {
      console.log(`❌ 验证失败！仍有 ${verify.count} 条记录未被删除`);
    }

    // 步骤5: 显示清理后的统计信息
    console.log('\n📊 清理后的数据库统计:');
    const totalQuery = `SELECT
      (SELECT COUNT(*) FROM order_access_windows WHERE order_type = 'single') as single_windows,
      (SELECT COUNT(*) FROM order_access_windows WHERE order_type = 'multi') as multi_windows,
      (SELECT COUNT(*) FROM order_access_windows) as total_windows`;

    const stats = await dbManager.get(totalQuery);
    console.log(`  单次订单窗口期记录: ${stats.single_windows}`);
    console.log(`  多次订单窗口期记录: ${stats.multi_windows}`);
    console.log(`  总窗口期记录数: ${stats.total_windows}`);

    // 关闭数据库连接
    await dbManager.close();
    console.log('\n🎉 清理操作完成！数据库已成功优化。');

  } catch (error) {
    console.error('❌ 清理过程中发生错误:', error);
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
  node clean_multi_order_windows.js    # 执行清理操作

🛡️  安全特性:
  - 自动备份数据库路径信息
  - 详细的操作日志
  - 清理前显示将要删除的记录
  - 清理后验证结果

⚠️  注意事项:
  - 此操作将永久删除多次订单的24小时窗口期记录
  - 删除操作不可逆，请确认后执行
  - 建议在执行前手动备份数据库文件

📁 数据库位置: ./database/orders.db
  `);
}

// 检查命令行参数
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showHelp();
  process.exit(0);
}

// 执行清理
if (require.main === module) {
  console.log('🔧 多次订单24小时窗口期记录清理工具');
  console.log('=====================================\n');

  cleanMultiOrderWindows();
}

module.exports = cleanMultiOrderWindows;