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
        this.db = new sqlite3.Database(this.dbPath, (err) => {
          if (err) {
            console.error('数据库连接失败:', err.message);
            reject(err);
          } else {
            console.log(`数据库已连接: ${this.dbPath}`);
            // 启用外键约束
            this.db.run('PRAGMA foreign_keys = ON');
            resolve(this.db);
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

  // 执行SQL语句的便捷方法
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('数据库未连接'));
        return;
      }
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
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