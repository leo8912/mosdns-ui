const axios = require('axios');
const cron = require('node-cron');
const db = require('./db');
require('dotenv').config();

let lastMetrics = null;

async function fetchAndStoreMetrics() {
    try {
        let mosdns_url = 'http://127.0.0.1:9080/metrics';
        try {
            const setting = await db.getAsync(`SELECT value FROM settings WHERE key = 'mosdns_api_url'`);
            if (setting && setting.value) mosdns_url = setting.value;
            else if (process.env.MOSDNS_API_URL) mosdns_url = process.env.MOSDNS_API_URL;
        } catch(e) { }

        const response = await axios.get(mosdns_url, { timeout: 3000 });
        const data = response.data;
        
        const current = {
            query_total: 0,
            hit_total: 0,
            lazy_hit_total: 0,
            cache_size: 0,
            latency_sum: 0,
            latency_count: 0
        };

        const lines = data.split('\n');
        lines.forEach(line => {
            if (line.startsWith('mosdns_plugin_metrics_collector_query_total')) {
                current.query_total = parseInt(line.split(' ')[1]);
            } else if (line.startsWith('mosdns_plugin_cache_hit_total')) {
                current.hit_total = parseInt(line.split(' ')[1]);
            } else if (line.startsWith('mosdns_plugin_cache_lazy_hit_total')) {
                current.lazy_hit_total = parseInt(line.split(' ')[1]);
            } else if (line.startsWith('mosdns_plugin_cache_cache_size')) {
                current.cache_size = parseInt(line.split(' ')[1]);
            } else if (line.startsWith('mosdns_plugin_metrics_collector_response_latency_millisecond_sum')) {
                current.latency_sum = parseFloat(line.split(' ')[1]);
            } else if (line.startsWith('mosdns_plugin_metrics_collector_response_latency_millisecond_count')) {
                current.latency_count = parseInt(line.split(' ')[1]);
            }
        });

        if (!lastMetrics || current.query_total < lastMetrics.query_total) {
            // 项目刚启动，或 MosDNS 发生了重启导致计数器归零
            lastMetrics = { ...current };
            return;
        }

        // 计算这一分钟内的差值（真实流量）
        const delta = {
            query_total: current.query_total - lastMetrics.query_total,
            hit_total: current.hit_total - lastMetrics.hit_total,
            lazy_hit_total: current.lazy_hit_total - lastMetrics.lazy_hit_total,
            cache_size: current.cache_size, // 缓存数是当前快照容量，不需要算差值
            latency_sum: current.latency_sum - lastMetrics.latency_sum,
            latency_count: current.latency_count - lastMetrics.latency_count
        };
        lastMetrics = { ...current };

        // 真实平均延迟 = 这一分钟内积攒的毫秒总数 / 这一分钟内处理的请求总数
        const avg_latency = delta.latency_count > 0 ? parseFloat((delta.latency_sum / delta.latency_count).toFixed(2)) : 0;

        await db.runAsync(`
            INSERT INTO metrics (query_total, hit_total, lazy_hit_total, cache_size, avg_latency)
            VALUES (?, ?, ?, ?, ?)
        `, [delta.query_total, delta.hit_total, delta.lazy_hit_total, delta.cache_size, avg_latency]);
        
        console.log(`[Metrics] Sampled at ${new Date().toISOString()}`);
    } catch (error) {
        console.error(`[Metrics] Error fetching metrics: ${error.message}`);
    }
}

cron.schedule('* * * * *', fetchAndStoreMetrics);

module.exports = { fetchAndStoreMetrics };
