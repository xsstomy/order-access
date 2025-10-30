const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

class DatabaseManager {
  constructor() {
    this.db = null;
    this.dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../database/orders.db');
  }

  // 初始化数据库连接
  connect() {
    return new Promise((resolve, reject) => {
      try {
        // 设置 SQLite 并发配置
        this.db = new sqlite3.Database(this.dbPath, (err) => {
          if (err) {
            console.error('数据库连接失败:', err.message);
            reject(err);
          } else {
            console.log(`数据库已连接: ${this.dbPath}`);

            // 配置 SQLite 基础设置
            this.db.serialize(() => {
              // 启用外键约束
              this.db.run('PRAGMA foreign_keys = ON');
              // 增加超时时间到30秒
              this.db.run('PRAGMA busy_timeout = 30000');
              // 设置更宽松的同步模式
              this.db.run('PRAGMA synchronous = NORMAL');

              resolve(this.db);
            });
          }
        });
      } catch (error) {
        console.error('数据库连接失败:', error.message);
        reject(error);
      }
    });
  }

  // 关闭数据库连接
  close() {
    return new Promise((resolve) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            console.error('关闭数据库时出错:', err.message);
          } else {
            console.log('数据库连接已关闭');
          }
          this.db = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  // 获取数据库实例
  getDatabase() {
    return this.db;
  }

  // 执行SQL语句的便捷方法，带重试机制
  run(sql, params = [], retries = 3) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('数据库未连接'));
        return;
      }

      const attemptRun = (attempt) => {
        this.db.run(sql, params, function(err) {
          if (err) {
            // 如果是数据库锁定错误且还有重试次数，则重试
            if (err.code === 'SQLITE_BUSY' && attempt < retries) {
              console.warn(`数据库繁忙，第${attempt}次重试... SQL: ${sql.substring(0, 50)}...`);
              setTimeout(() => attemptRun(attempt + 1), 100 * attempt);
              return;
            }
            reject(err);
          } else {
            resolve({ id: this.lastID, changes: this.changes });
          }
        });
      };

      attemptRun(1);
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('数据库未连接'));
        return;
      }
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('数据库未连接'));
        return;
      }
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
}

module.exports = new DatabaseManager();