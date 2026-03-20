const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dataDir = process.env.DATA_DIR || path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'mosdns.db');
const db = new sqlite3.Database(dbPath);

// 使用 Promise 封装 db.run 和 db.all 方便调用
db.runAsync = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
};

db.allAsync = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

db.getAsync = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

// 初始化表结构
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            query_total INTEGER,
            hit_total INTEGER,
            lazy_hit_total INTEGER,
            cache_size INTEGER,
            avg_latency REAL
        )
    `);

    // Recreate audit_logs with heavy metrics
    db.run(`DROP TABLE IF EXISTS audit_logs`);
    db.run(`
        CREATE TABLE audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            domain TEXT,
            type TEXT,
            client_ip TEXT,
            rcode TEXT,
            latency_ms INTEGER,
            route TEXT,
            upstream TEXT
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    `);
    db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('mosdns_api_url', 'http://127.0.0.1:9080/metrics')`);

    db.run(`CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON metrics(timestamp)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp)`);
});

module.exports = db;
