#!/usr/bin/env node

const dbManager = require('../src/config/database');
const { backupDatabase } = require('./backup-database');

// 时区迁移脚本 - 将 UTC 时间戳转换为北京时间
async function migrateTimezone() {
  try {
    console.log('开始时区迁移...');

    // 连接数据库
    await dbManager.connect();
    const db = dbManager.getDatabase();

    console.log('✅ 数据库连接成功');

    // 1. 更新 multi_orders 表的 created_at 字段
    console.log('📝 更新 multi_orders 表的 created_at 字段...');
    const multiOrdersResult = await dbManager.run(`
      UPDATE multi_orders
      SET created_at = datetime(created_at, '+08:00')
    `);
    console.log(`✅ 更新了 ${multiOrdersResult.changes} 条 multi_orders 记录`);

    // 2. 更新 device_bindings 表的时间字段
    console.log('📝 更新 device_bindings 表的时间字段...');
    const deviceBindingsResult = await dbManager.run(`
      UPDATE device_bindings
      SET created_at = datetime(created_at, '+08:00'),
          last_accessed_at = datetime(last_accessed_at, '+08:00')
    `);
    console.log(`✅ 更新了 ${deviceBindingsResult.changes} 条 device_bindings 记录`);

    // 3. 更新 order_usage 表的 accessed_at 字段
    console.log('📝 更新 order_usage 表的 accessed_at 字段...');
    const orderUsageResult = await dbManager.run(`
      UPDATE order_usage
      SET accessed_at = datetime(accessed_at, '+08:00')
    `);
    console.log(`✅ 更新了 ${orderUsageResult.changes} 条 order_usage 记录`);

    // 4. 检查是否有 order_access_windows 表需要更新
    const tableExists = await dbManager.get(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='order_access_windows'
    `);

    if (tableExists) {
      console.log('📝 更新 order_access_windows 表的时间字段...');
      const accessWindowsResult = await dbManager.run(`
        UPDATE order_access_windows
        SET first_accessed_at = datetime(first_accessed_at, '+08:00'),
            expires_at = datetime(expires_at, '+08:00')
      `);
      console.log(`✅ 更新了 ${accessWindowsResult.changes} 条 order_access_windows 记录`);
    } else {
      console.log('ℹ️  order_access_windows 表不存在，跳过更新');
    }

    console.log('🎉 时区迁移完成！');

    // 5. 验证迁移结果
    console.log('🔍 验证迁移结果...');

    // 检查几条示例记录
    const sampleMultiOrder = await dbManager.get(`
      SELECT order_number, created_at FROM multi_orders LIMIT 1
    `);

    if (sampleMultiOrder) {
      console.log(`📋 示例订单记录: ${sampleMultiOrder.order_number}, 创建时间: ${sampleMultiOrder.created_at}`);
    }

    const sampleUsage = await dbManager.get(`
      SELECT order_number, accessed_at FROM order_usage LIMIT 1
    `);

    if (sampleUsage) {
      console.log(`📋 示例使用记录: ${sampleUsage.order_number}, 访问时间: ${sampleUsage.accessed_at}`);
    }

    console.log('✅ 迁移验证完成');

    return {
      success: true,
      updatedRecords: {
        multiOrders: multiOrdersResult.changes,
        deviceBindings: deviceBindingsResult.changes,
        orderUsage: orderUsageResult.changes
      }
    };

  } catch (error) {
    console.error('❌ 时区迁移失败:', error.message);
    throw error;
  } finally {
    // 关闭数据库连接
    await dbManager.close();
  }
}

// 主函数
async function main() {
  const command = process.argv[2];

  try {
    if (command === 'migrate') {
      // 执行迁移前先备份
      console.log('🔄 执行迁移前备份...');
      const backupPath = await backupDatabase();
      console.log(`✅ 备份完成: ${backupPath}`);

      // 执行迁移
      const result = await migrateTimezone();
      console.log('🎊 时区迁移成功完成！');
      console.log('📊 迁移统计:', result.updatedRecords);

    } else {
      console.log('使用方法:');
      console.log('  node scripts/migrate-timezone.js migrate   # 执行时区迁移');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ 操作失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本，则执行主函数
if (require.main === module) {
  main();
}

module.exports = { migrateTimezone };