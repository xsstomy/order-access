#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 数据库备份脚本
async function backupDatabase() {
  try {
    console.log('开始备份数据库...');

    const databasePath = path.join(__dirname, '../database/orders.db');
    const backupPath = path.join(__dirname, '../database/orders.db.backup.' + new Date().toISOString().replace(/[:.]/g, '-'));

    // 确保数据库文件存在
    if (!fs.existsSync(databasePath)) {
      console.error('数据库文件不存在:', databasePath);
      process.exit(1);
    }

    // 创建备份目录（如果不存在）
    const backupDir = path.dirname(backupPath);
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // 复制数据库文件
    fs.copyFileSync(databasePath, backupPath);

    console.log('数据库备份完成:');
    console.log('原文件:', databasePath);
    console.log('备份文件:', backupPath);

    // 返回备份文件路径，供后续使用
    return backupPath;

  } catch (error) {
    console.error('数据库备份失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本，则执行备份
if (require.main === module) {
  backupDatabase()
    .then((backupPath) => {
      console.log('备份成功完成，备份文件路径:', backupPath);
      process.exit(0);
    })
    .catch((error) => {
      console.error('备份失败:', error.message);
      process.exit(1);
    });
}

module.exports = { backupDatabase };