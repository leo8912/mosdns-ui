const fs = require('fs');
const path = require('path');
const db = require('./db');
require('dotenv').config();

let activeWatcher = null;
let activeStream = null;

async function reloadTailer() {
    if (activeWatcher) {
        activeWatcher.close();
        activeWatcher = null;
    }
    if (activeStream) {
        activeStream.close();
        activeStream = null;
    }
    console.log('[Tailer] Detached from previous log file');
    await startTailer();
}

async function startTailer() {
    let logFilePath = process.env.LOG_FILE_PATH || '/etc/mosdns/mosdns.log';
    try {
        const setting = await db.getAsync(`SELECT value FROM settings WHERE key = 'mosdns_log_path'`);
        if (setting && setting.value) logFilePath = setting.value;
    } catch(e) {}

    if (!fs.existsSync(logFilePath)) {
        console.warn(`[Tailer] Log file not found: ${logFilePath}`);
        return;
    }

    console.log(`[Tailer] Watching log file: ${logFilePath}`);
    let fileSize = fs.statSync(logFilePath).size;

    activeWatcher = fs.watch(logFilePath, (event) => {
        if (event === 'change') {
            const currentSize = fs.statSync(logFilePath).size;
            if (currentSize < fileSize) fileSize = 0; // Log rotated
            
            activeStream = fs.createReadStream(logFilePath, {
                start: fileSize,
                end: currentSize,
                encoding: 'utf8'
            });

            activeStream.on('data', async (chunk) => {
                const lines = chunk.split('\n');
                for (let line of lines) {
                    if (!line.trim()) continue;
                    
                    if (line.includes('query summary') && line.includes('{')) {
                        try {
                            const jsonStr = line.substring(line.indexOf('{'));
                            const data = JSON.parse(jsonStr);
                            
                            const qtypeMap = { 1: 'A', 28: 'AAAA', 5: 'CNAME', 15: 'MX', 16: 'TXT', 65: 'HTTPS' };
                            
                            let latency_ms = 0;
                            if (data.elapsed) {
                                const msMatch = data.elapsed.match(/([0-9.]+)ms/);
                                const sMatch = data.elapsed.match(/([0-9.]+)s/);
                                if (msMatch) latency_ms = Math.round(parseFloat(msMatch[1]));
                                else if (sMatch) latency_ms = Math.round(parseFloat(sMatch[1]) * 1000);
                            }
                            
                            let route = 'cache';
                            let upstream = data.upstream || '';
                            
                            // Check explicit upstream
                            if (upstream) {
                                if (upstream.includes('223.') || upstream.includes('119.') || upstream.includes('114.')) {
                                    route = 'cn';
                                } else if (upstream.includes('1.1.1.1') || upstream.includes('8.8.8.8') || upstream.includes('google') || upstream.includes('192.168.2.250') || upstream.includes('proxy')) {
                                    route = 'proxy';
                                } else {
                                    route = 'cn'; // fallback internet route
                                }
                            } else {
                                // No upstream, it means cache, reject, or timeout
                                upstream = 'Local Cache';
                                route = 'cache';
                                // if it took too long, it was likely a timeout 
                                if (latency_ms > 100) {
                                    upstream = 'Timeout/Unknown';
                                    route = 'unknown';
                                }
                            }

                            const domain = data.qname ? data.qname.replace(/\.$/, '') : 'unknown';
                            const type = qtypeMap[data.qtype] || String(data.qtype || 'A');
                            const rcode = data.resp_rcode === 0 ? 'NOERROR' : `ERR${data.resp_rcode}`;
                            const client_ip = data.client || 'Unknown';

                            await db.runAsync(
                                `INSERT INTO audit_logs (timestamp, domain, type, client_ip, rcode, latency_ms, route, upstream) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                                [new Date().toISOString(), domain, type, client_ip, rcode, latency_ms, route, upstream]
                            );
                        } catch (e) {
                            // Ignored
                        }
                    }
                }
            });

            fileSize = currentSize;
        }
    });

    activeWatcher.on('error', (e) => {
        console.error(`[Tailer] Watcher error: ${e.message}`);
    });
}

module.exports = { startTailer, reloadTailer };
