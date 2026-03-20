const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
const db = require('./db');
const { fetchAndStoreMetrics } = require('./collector');
const { startTailer, reloadTailer } = require('./tailer');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/status', async (req, res) => {
    try {
        const lastMetric = await db.getAsync('SELECT cache_size FROM metrics ORDER BY timestamp DESC LIMIT 1');
        const agg = await db.getAsync(`
            SELECT 
                SUM(query_total) as query_total, 
                SUM(hit_total) as hit_total,
                SUM(avg_latency * query_total) / SUM(query_total) as avg_latency
            FROM metrics 
            WHERE timestamp > datetime('now', '-24 hour')
            AND query_total > 0
        `);
        res.json({
            query_total: agg?.query_total || 0,
            hit_total: agg?.hit_total || 0,
            cache_size: lastMetric?.cache_size || 0,
            avg_latency: Math.round(agg?.avg_latency || 0)
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/stats/trend', async (req, res) => {
    try {
        const rangeHours = parseInt(req.query.range) || 24; // 动态支持 1H 或 24H，默认 24
        const stats = await db.allAsync(`
            SELECT timestamp, query_total, hit_total, cache_size 
            FROM metrics 
            WHERE timestamp > datetime('now', '-${rangeHours} hour')
            ORDER BY timestamp ASC
        `);
        res.json(stats);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/logs', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 50;
        const offset = (page - 1) * limit;
        const logs = await db.allAsync(`
            SELECT id, timestamp, domain, type, client_ip, rcode, latency_ms, route, upstream 
            FROM audit_logs 
            ORDER BY id DESC LIMIT ? OFFSET ?`, 
            [limit, offset]
        );
        res.json(logs);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/stats/route_latency', async (req, res) => {
    try {
        const stats = await db.allAsync(`
            SELECT route, round(avg(latency_ms), 1) as avg_latency, count(1) as req_count 
            FROM audit_logs 
            WHERE timestamp > datetime('now', '-1 hour')
            GROUP BY route
        `);
        res.json(stats);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/settings', async (req, res) => {
    try {
        const rows = await db.allAsync('SELECT key, value FROM settings');
        const settings = {};
        rows.forEach(r => { settings[r.key] = r.value; });
        res.json(settings);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/settings', async (req, res) => {
    try {
        const { mosdns_api_url, mosdns_log_path } = req.body;
        if (mosdns_api_url !== undefined) {
            await db.runAsync(
                `INSERT INTO settings (key, value) VALUES ('mosdns_api_url', ?) 
                 ON CONFLICT(key) DO UPDATE SET value=excluded.value`, 
                [mosdns_api_url]
            );
        }
        if (mosdns_log_path !== undefined) {
            await db.runAsync(
                `INSERT INTO settings (key, value) VALUES ('mosdns_log_path', ?) 
                 ON CONFLICT(key) DO UPDATE SET value=excluded.value`, 
                [mosdns_log_path]
            );
            reloadTailer();
        }
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/stats/top_domains', async (req, res) => {
    try {
        const stats = await db.allAsync(`SELECT domain as name, COUNT(1) as value FROM audit_logs GROUP BY domain ORDER BY value DESC LIMIT 10`);
        res.json(stats);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/stats/top_clients', async (req, res) => {
    try {
        const stats = await db.allAsync(`SELECT client_ip as name, COUNT(1) as value FROM audit_logs GROUP BY client_ip ORDER BY value DESC LIMIT 10`);
        res.json(stats);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

cron.schedule('0 3 * * *', async () => {
    try {
        const keepDays = 7;
        const cutoffDate = new Date(Date.now() - keepDays * 24 * 60 * 60 * 1000).toISOString();
        const logsRes = await db.runAsync(`DELETE FROM audit_logs WHERE timestamp < ?`, [cutoffDate]);
        const metRes = await db.runAsync(`DELETE FROM metrics WHERE timestamp < ?`, [cutoffDate]);
        console.log(`[Cleaner] Automatically deleted data older than ${cutoffDate}. Logs: ${logsRes.changes || 0}`);
    } catch(e) { console.error('[Cleaner] Error:', e); }
});

app.listen(port, () => {
    console.log(`[Server] MosDNS-UI Backend running on http://localhost:${port}`);
    startTailer();
    fetchAndStoreMetrics();
});
