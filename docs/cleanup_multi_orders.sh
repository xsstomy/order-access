#!/bin/bash

echo "🔧 多次订单24小时限制清理 - 一键执行脚本"
echo "=========================================="

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到 Node.js，请先安装 Node.js"
    exit 1
fi

echo "✅ Node.js 版本: $(node --version)"

# 步骤1: 创建数据库备份
echo ""
echo "📦 步骤1: 创建数据库备份..."
if node backup_database.js; then
    echo "✅ 数据库备份成功"
else
    echo "❌ 数据库备份失败，停止执行清理"
    exit 1
fi

echo ""
echo "⏳ 等待 2 秒后继续..."
sleep 2

# 步骤2: 执行清理操作
echo ""
echo "🗑️  步骤2: 执行清理操作..."
if node clean_multi_order_windows.js; then
    echo "✅ 清理操作完成"
else
    echo "❌ 清理操作失败"
    echo "💡 提示: 可以从备份文件恢复数据库"
    exit 1
fi

echo ""
echo "🎉 所有操作完成!"
echo "💡 备份文件位置: $(ls -t ./database/orders_backup_*.db | head -1)"