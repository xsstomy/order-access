#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const OrderOperations = require('../db/operations');
const { initializeDatabase } = require('../db/init');

class OrderAccessCLI {
  constructor() {
    this.orderOps = new OrderOperations();
    this.dbConnected = false;
    this.commands = {
      'init-db': this.initDatabase.bind(this),
      'add': this.addMultiOrder.bind(this),
      'import': this.importOrders.bind(this),
      'query': this.queryOrder.bind(this),
      'help': this.showHelp.bind(this),
      '--help': this.showHelp.bind(this),
      '-h': this.showHelp.bind(this)
    };
  }

  async initDatabase() {
    try {
      console.log('正在初始化数据库...');
      await initializeDatabase();
      this.dbConnected = true;
      console.log('✅ 数据库初始化成功');
    } catch (error) {
      console.error('❌ 数据库初始化失败:', error.message);
      process.exit(1);
    }
  }

  // 确保数据库已连接
  async ensureDatabaseConnected() {
    if (!this.dbConnected) {
      console.log('正在连接数据库...');
      const dbManager = require('../../config/database');
      await dbManager.connect();
      this.dbConnected = true;
    }
  }

  async addMultiOrder(orderNumber, maxAccess = null) {
    try {
      if (!orderNumber) {
        console.error('❌ 错误: 订单号不能为空');
        console.log('使用方法: node cli.js add <订单号> [最大访问次数]');
        return;
      }

      const result = await this.orderOps.addMultiOrder(orderNumber.trim(), maxAccess);

      if (result.changes > 0) {
        console.log(`✅ 成功添加多次订单: ${orderNumber.trim()}`);
        if (maxAccess) {
          console.log(`   最大访问次数: ${maxAccess}`);
        } else {
          console.log(`   访问次数: 无限制`);
        }
      } else {
        console.log(`⚠️  订单已存在于白名单中: ${orderNumber.trim()}`);
      }
    } catch (error) {
      console.error('❌ 添加多次订单失败:', error.message);
    }
  }

  async importOrders(filePath) {
    try {
      if (!filePath) {
        console.error('❌ 错误: CSV文件路径不能为空');
        console.log('使用方法: node cli.js import <CSV文件路径>');
        console.log('CSV格式: 每行一个订单号，或格式为"订单号,最大访问次数"');
        return;
      }

      if (!fs.existsSync(filePath)) {
        console.error(`❌ 错误: 文件不存在: ${filePath}`);
        return;
      }

      console.log(`正在读取文件: ${filePath}`);
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());

      if (lines.length === 0) {
        console.log('⚠️  文件为空，没有找到订单数据');
        return;
      }

      const orders = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = line.split(',');
        const orderNumber = parts[0].trim();
        const maxAccess = parts[1] ? parseInt(parts[1].trim()) : null;

        if (orderNumber) {
          orders.push({ orderNumber, maxAccess });
        }
      }

      if (orders.length === 0) {
        console.log('⚠️  没有找到有效的订单数据');
        return;
      }

      console.log(`准备导入 ${orders.length} 个订单...`);
      const insertedCount = await this.orderOps.addMultipleMultiOrders(orders);

      console.log(`✅ 导入完成`);
      console.log(`   总订单数: ${orders.length}`);
      console.log(`   成功添加: ${insertedCount}`);
      console.log(`   跳过重复: ${orders.length - insertedCount}`);

    } catch (error) {
      console.error('❌ 导入订单失败:', error.message);
    }
  }

  async queryOrder(orderNumber) {
    try {
      if (!orderNumber) {
        console.error('❌ 错误: 订单号不能为空');
        console.log('使用方法: node cli.js query <订单号>');
        return;
      }

      console.log(`查询订单: ${orderNumber.trim()}`);
      console.log('─'.repeat(50));

      const usageInfo = await this.orderOps.getOrderUsage(orderNumber.trim());

      if (usageInfo.usageCount === 0 && !usageInfo.isMultiOrder) {
        console.log('📋 订单状态: 单次订单，尚未使用');
        console.log('📝 使用记录: 无');
      } else if (usageInfo.isMultiOrder) {
        const remainingAccess = await this.orderOps.checkMultiOrderRemainingAccess(orderNumber.trim());
        console.log('📋 订单类型: 多次订单');
        console.log(`📅 创建时间: ${usageInfo.multiOrderInfo.created_at}`);
        console.log(`🔢 最大访问次数: ${usageInfo.multiOrderInfo.max_access || '无限制'}`);
        console.log(`📊 已使用次数: ${usageInfo.usageCount}`);
        console.log(`💎 剩余访问次数: ${remainingAccess === Infinity ? '无限制' : remainingAccess}`);
      } else {
        console.log('📋 订单状态: 单次订单，已使用');
        console.log('📝 使用记录:');
      }

      if (usageInfo.usageRecords.length > 0) {
        console.log('\n📝 使用记录:');
        usageInfo.usageRecords.forEach((record, index) => {
          console.log(`   ${index + 1}. ${record.accessed_at}`);
          console.log(`      IP地址: ${record.ip_address}`);
          console.log(`      User-Agent: ${record.user_agent || '未知'}`);
          if (record.session_id) {
            console.log(`      会话ID: ${record.session_id}`);
          }
          console.log('');
        });
      }

      console.log('─'.repeat(50));

    } catch (error) {
      console.error('❌ 查询订单失败:', error.message);
    }
  }

  showHelp() {
    console.log(`
Order Access CLI - 订单访问控制系统命令行工具

使用方法:
  node cli.js <命令> [参数...]

命令列表:
  init-db                    初始化数据库
  add <订单号> [最大次数]     添加多次订单到白名单
  import <CSV文件>           从CSV文件批量导入订单
  query <订单号>             查询订单使用情况
  help                       显示此帮助信息

示例:
  # 初始化数据库
  node cli.js init-db

  # 添加无限制多次订单
  node cli.js add ORDER123

  # 添加限制10次的多次订单
  node cli.js add ORDER456 10

  # 批量导入订单
  node cli.js import orders.csv

  # 查询订单使用情况
  node cli.js query ORDER123

CSV文件格式:
  # 每行一个订单，可选最大访问次数
  ORDER123
  ORDER456,10
  ORDER789

环境变量:
  DATABASE_PATH    数据库文件路径 (默认: ./database/orders.db)

注意:
  - 首次使用前请先运行 'init-db' 初始化数据库
  - 单次订单会在首次使用时自动记录，无需预先添加
  - 多次订单需要预先添加到白名单中
`);
  }

  async run() {
    const args = process.argv.slice(2);
    const command = args[0];

    if (!command || !this.commands[command]) {
      console.error('❌ 错误: 未知命令或未提供命令');
      this.showHelp();
      process.exit(1);
    }

    try {
      // 确保数据库连接（除了 init-db 命令）
      if (command !== 'init-db' && command !== 'help' && command !== '--help' && command !== '-h') {
        await this.ensureDatabaseConnected();
      }
      await this.commands[command](...args.slice(1));
    } catch (error) {
      console.error('❌ 执行命令失败:', error.message);
      process.exit(1);
    }
  }
}

// 如果直接运行此文件，则执行CLI
if (require.main === module) {
  const cli = new OrderAccessCLI();
  cli.run();
}

module.exports = OrderAccessCLI;