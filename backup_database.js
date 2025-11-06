#!/usr/bin/env node

/**
 * 数据库备份工具
 * 在执行清理操作前创建数据库备份
 */

const fs = require('fs');
const path = require('path');

function backupDatabase() {
  const dbPath = './database/orders.db';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `./database/orders_backup_${timestamp}.db`;

  console.log('🔄 创建数据库备份...\n');

  try {
    // 检查源文件是否存在
    if (!fs.existsSync(dbPath)) {
      console.log(`❌ 数据库文件不存在: ${dbPath}`);
      return false;
    }

    // 获取文件信息
    const stats = fs.statSync(dbPath);
    console.log(`📁 源文件: ${dbPath}`);
    console.log(`📏 文件大小: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log(`📅 修改时间: ${stats.mtime.toLocaleString()}\n`);

    // 复制文件
    fs.copyFileSync(dbPath, backupPath);

    const backupStats = fs.statSync(backupPath);
    console.log(`✅ 备份成功!`);
    console.log(`📁 备份文件: ${backupPath}`);
    console.log(`📏 备份大小: ${(backupStats.size / 1024).toFixed(2)} KB`);

    // 验证备份文件大小一致
    if (stats.size === backupStats.size) {
      console.log('✅ 备份文件验证通过 (大小一致)');
      return backupPath;
    } else {
      console.log('❌ 备份文件验证失败 (大小不一致)');
      return false;
    }

  } catch (error) {
    console.error('❌ 备份过程中发生错误:', error.message);
    return false;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  console.log('🔧 数据库备份工具');
  console.log('==================\n');

  const backupPath = backupDatabase();
  if (backupPath) {
    console.log(`\n🎉 备份完成! 可以安全进行清理操作。`);
    console.log(`   如需恢复，请将 ${backupPath} 重命名为 orders.db`);
  } else {
    console.log(`\n❌ 备份失败! 请检查文件权限或磁盘空间。`);
    process.exit(1);
  }
}

module.exports = backupDatabase;