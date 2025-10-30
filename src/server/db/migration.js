const dbManager = require('../../config/database');

async function migrateDatabase() {
  try {
    await dbManager.connect();
    const db = dbManager.getDatabase();

    console.log('开始数据库迁移...');

    // 检查 device_bindings 表是否已存在
    const tableExists = await dbManager.get(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='device_bindings'
    `);

    if (!tableExists) {
      console.log('创建 device_bindings 表...');
      await dbManager.run(`
        CREATE TABLE device_bindings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_number TEXT NOT NULL,
          device_id TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(order_number, device_id)
        )
      `);

      await dbManager.run(`
        CREATE INDEX idx_device_bindings_order_number ON device_bindings(order_number)
      `);

      await dbManager.run(`
        CREATE INDEX idx_device_bindings_device_id ON device_bindings(device_id)
      `);
    }

    // 检查 order_usage 表是否有 device_id 列
    const columns = await dbManager.all(`
      PRAGMA table_info(order_usage)
    `);

    const hasDeviceIdColumn = columns.some(col => col.name === 'device_id');

    if (!hasDeviceIdColumn) {
      console.log('为 order_usage 表添加 device_id 列...');
      await dbManager.run(`
        ALTER TABLE order_usage ADD COLUMN device_id TEXT
      `);

      await dbManager.run(`
        CREATE INDEX IF NOT EXISTS idx_order_usage_device_id ON order_usage(device_id)
      `);
    }

    console.log('数据库迁移完成');
    return true;
  } catch (error) {
    console.error('数据库迁移失败:', error.message);
    throw error;
  }
}

// 如果直接运行此文件，则执行迁移
if (require.main === module) {
  migrateDatabase()
    .then(() => {
      console.log('迁移完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('迁移失败:', error.message);
      process.exit(1);
    });
}

// 24小时访问窗口期迁移
async function add24HourAccessWindows() {
  try {
    await dbManager.connect();

    console.log('添加24小时访问窗口期功能...');

    // 为单次订单添加24小时访问窗口期表
    await dbManager.run(`
      CREATE TABLE IF NOT EXISTS single_order_access_windows (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_number TEXT UNIQUE NOT NULL,
        first_accessed_at DATETIME NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(order_number)
      )
    `);

    // 创建索引
    await dbManager.run(`
      CREATE INDEX IF NOT EXISTS idx_single_order_windows_order_number
      ON single_order_access_windows(order_number)
    `);

    await dbManager.run(`
      CREATE INDEX IF NOT EXISTS idx_single_order_windows_expires_at
      ON single_order_access_windows(expires_at)
    `);

    console.log('24小时访问窗口期表创建完成');
    return true;
  } catch (error) {
    console.error('添加24小时访问窗口期失败:', error.message);
    throw error;
  }
}

module.exports = { migrateDatabase, add24HourAccessWindows };