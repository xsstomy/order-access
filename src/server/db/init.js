const dbManager = require('../../config/database');

async function initializeDatabase() {
  try {
    await dbManager.connect();
    const db = dbManager.getDatabase();

    // 创建多次订单白名单表
    await dbManager.run(`
      CREATE TABLE IF NOT EXISTS multi_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_number TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        max_access INTEGER DEFAULT NULL
      )
    `);

    // 创建设备绑定表
    await dbManager.run(`
      CREATE TABLE IF NOT EXISTS device_bindings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_number TEXT NOT NULL,
        device_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(order_number, device_id)
      )
    `);

    // 创建订单使用记录表
    await dbManager.run(`
      CREATE TABLE IF NOT EXISTS order_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_number TEXT NOT NULL,
        ip_address TEXT NOT NULL,
        user_agent TEXT,
        device_id TEXT,
        accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        session_id TEXT
      )
    `);

    // 创建索引提高查询性能
    await dbManager.run(`
      CREATE INDEX IF NOT EXISTS idx_multi_orders_order_number ON multi_orders(order_number)
    `);

    await dbManager.run(`
      CREATE INDEX IF NOT EXISTS idx_order_usage_order_number ON order_usage(order_number)
    `);

    await dbManager.run(`
      CREATE INDEX IF NOT EXISTS idx_order_usage_session_id ON order_usage(session_id)
    `);

    await dbManager.run(`
      CREATE INDEX IF NOT EXISTS idx_device_bindings_order_number ON device_bindings(order_number)
    `);

    await dbManager.run(`
      CREATE INDEX IF NOT EXISTS idx_device_bindings_device_id ON device_bindings(device_id)
    `);

    await dbManager.run(`
      CREATE INDEX IF NOT EXISTS idx_order_usage_device_id ON order_usage(device_id)
    `);

    // 创建访问时间索引，优化验证记录的时间范围查询
    await dbManager.run(`
      CREATE INDEX IF NOT EXISTS idx_order_usage_accessed_at ON order_usage(accessed_at)
    `);

    console.log('数据库初始化完成');
    return true;
  } catch (error) {
    console.error('数据库初始化失败:', error.message);
    throw error;
  }
}

// 如果直接运行此文件，则执行初始化
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('初始化完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('初始化失败:', error.message);
      process.exit(1);
    });
}

module.exports = { initializeDatabase };