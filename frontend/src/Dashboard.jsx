import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts';
import { 
  Activity, Shield, Database, Zap, Clock, Search, 
  Server, Globe, Hash, ArrowUpRight, ChevronRight,
  Filter, AlertCircle, RefreshCw, Settings
} from 'lucide-react';
const API_BASE = import.meta.env.DEV ? 'http://localhost:3000/api' : '/api';
const Dashboard = () => {
  const [status, setStatus] = useState({});
  const [trend, setTrend] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const [showSettings, setShowSettings] = useState(false);
  const [apiUrl, setApiUrl] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Interactive States
  const [timeRange, setTimeRange] = useState(24);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [logPath, setLogPath] = useState('');
  const [topDomains, setTopDomains] = useState([]);
  const [topClients, setTopClients] = useState([]);
  const [routeStats, setRouteStats] = useState({ cn: { avg_latency: 0, req_count: 0 }, proxy: { avg_latency: 0, req_count: 0 }, cache: { avg_latency: 0, req_count: 0 } });

  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${API_BASE}/settings`);
      if (res.data.mosdns_api_url) setApiUrl(res.data.mosdns_api_url);
      if (res.data.mosdns_log_path) setLogPath(res.data.mosdns_log_path);
    } catch (e) {
      console.error("无法加载配置", e);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await axios.post(`${API_BASE}/settings`, { mosdns_api_url: apiUrl, mosdns_log_path: logPath });
      setShowSettings(false);
      fetchData(); 
    } catch (e) {
      console.error("配置保存失败", e);
    }
    setSaving(false);
  };

  const loadMoreLogs = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    try {
      const res = await axios.get(`${API_BASE}/logs?page=${nextPage}`);
      if (res.data.length > 0) {
        setLogs(prev => [...prev, ...res.data]);
        setPage(nextPage);
      }
    } catch (e) {
      console.error('分页加载失败', e);
    }
    setLoadingMore(false);
  };

  const fetchData = async (isBackground = false) => {
    try {
      const [sRes, tRes, routeRes] = await Promise.all([
        axios.get(`${API_BASE}/status`),
        axios.get(`${API_BASE}/stats/trend?range=${timeRange}`),
        axios.get(`${API_BASE}/stats/route_latency`)
      ]);
      setStatus(sRes.data);
      setTrend(tRes.data);
      
      const defaultStats = { cn: { avg_latency: 0, req_count: 0 }, proxy: { avg_latency: 0, req_count: 0 }, cache: { avg_latency: 0, req_count: 0 } };
      routeRes.data.forEach(item => {
          if (defaultStats[item.route]) {
              defaultStats[item.route] = item;
          }
      });
      setRouteStats(defaultStats);
      
      if (activeTab === 'global') {
          const [tdRes, tcRes] = await Promise.all([
            axios.get(`${API_BASE}/stats/top_domains`),
            axios.get(`${API_BASE}/stats/top_clients`)
          ]);
          setTopDomains(tdRes.data);
          setTopClients(tcRes.data);
      }
      
      setLastRefreshed(new Date());
      setLoading(false);
    } catch (e) {
      console.error("数据获取失败", e);
    }
  };

  useEffect(() => {
    fetchData();
    const timer = setInterval(() => fetchData(true), 5000);
    return () => clearInterval(timer);
  }, [page, searchQuery, activeTab, timeRange]);

  useEffect(() => {
    const fetchTrendOnly = async () => {
      try {
        const tRes = await axios.get(`${API_BASE}/stats/trend?range=${timeRange}`);
        setTrend(tRes.data);
      } catch (e) {}
    };
    fetchTrendOnly();
  }, [timeRange]);

  const hitRate = status.query_total > 0 
    ? ((status.hit_total / status.query_total) * 100).toFixed(1) 
    : 0;

  return (
    <div className="min-h-screen bg-[#030303] text-[#e1e1e1] selection:bg-indigo-500/30">
      {/* 侧边导航栏 */}
      <nav className="fixed left-0 top-0 h-full w-20 flex flex-col items-center py-8 gap-10 border-r border-white/5 bg-black/20 backdrop-blur-md z-50 transition-all duration-500">
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-4 animate-float">
          <Server className="w-6 h-6 text-white" />
        </div>
        <div className="flex flex-col gap-8 text-gray-500">
          <Activity onClick={() => setActiveTab('dashboard')} className={`w-6 h-6 cursor-pointer transition-colors ${activeTab === 'dashboard' ? 'text-indigo-500' : 'hover:text-white'}`} title="仪表盘" />
          <Shield onClick={() => setActiveTab('security')} className={`w-6 h-6 cursor-pointer transition-colors ${activeTab === 'security' ? 'text-indigo-500' : 'hover:text-white'}`} title="安全中心" />
          <Globe onClick={() => setActiveTab('global')} className={`w-6 h-6 cursor-pointer transition-colors ${activeTab === 'global' ? 'text-indigo-500' : 'hover:text-white'}`} title="全局视图" />
          <Database onClick={() => setActiveTab('database')} className={`w-6 h-6 cursor-pointer transition-colors ${activeTab === 'database' ? 'text-indigo-500' : 'hover:text-white'}`} title="数据库" />
        </div>
      </nav>

      {/* 主内容区 */}
      <main className="pl-24 pr-8 py-8 md:pl-28 md:pr-12">
        {/* 顶部标题栏 */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                网络运行概览
              </h1>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold tracking-wider uppercase border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                已连接
              </span>
            </div>
            <p className="text-gray-500 text-sm">MosDNS 实时状态监控与流量审计控制台</p>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="text-right hidden sm:block">
                <div className="text-xs text-gray-500 uppercase tracking-widest font-bold">同步状态</div>
                <div className="text-sm font-medium text-gray-300 flex items-center gap-2 justify-end">
                  {lastRefreshed.toLocaleTimeString()}
                  <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                </div>
             </div>
             <button onClick={() => { setShowSettings(true); fetchSettings(); }} className="p-3 glass-card rounded-xl hover:bg-white/5 transition-all text-gray-400 hover:text-white" title="系统设置">
                <Settings className="w-5 h-5" />
             </button>
             <button onClick={fetchData} className="p-3 glass-card rounded-xl hover:bg-white/5 transition-all text-gray-400 hover:text-white" title="手动提取">
                <Filter className="w-5 h-5" />
             </button>
          </div>
        </header>

        {/* 系统设置弹窗 */}
        {showSettings && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="glass-card w-full max-w-lg p-8 rounded-[2rem] glow-purple relative border-indigo-500/20 shadow-[0_0_50px_rgba(99,102,241,0.1)]">
              <h2 className="text-2xl font-bold mb-8 text-white flex items-center gap-3">
                <Settings className="w-6 h-6 text-indigo-400" />系统配置
              </h2>
              
              <div className="mb-8">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                  MosDNS Metrics 接口地址
                </label>
                <input 
                  type="text" 
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="http://192.168.x.x:9080/metrics"
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-3 leading-relaxed">
                  用于采集 DNS 总查询量、命中率和延迟等性能图表数据。如果你在 Docker 中运行本面板，且 MosDNS 不在同一网段，请务必填写<span className="text-indigo-400">宿主机局域网 IP</span>。
                </p>
              </div>
              
              <div className="mb-8">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                  MosDNS 审计日志绝对路径
                </label>
                <input 
                  type="text" 
                  value={logPath}
                  onChange={(e) => setLogPath(e.target.value)}
                  placeholder="/etc/mosdns/mosdns.log"
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-3 leading-relaxed">
                  用于审计页面的实时数据溯源。修改该路径后，系统会<span className="text-emerald-400">热重载底层截获挂载点</span>（无需重启环境容器）。默认挂载路径为 `/etc/mosdns/mosdns.log`。
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-white/5">
                <button 
                  onClick={() => setShowSettings(false)}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  取消
                </button>
                <button 
                  onClick={saveSettings}
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold bg-indigo-500 hover:bg-indigo-400 text-white transition-all shadow-[0_0_15px_rgba(99,102,241,0.4)] disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? (
                    <><RefreshCw className="w-4 h-4 animate-spin" /> 保存中...</>
                  ) : '保存更改'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 安全防护中心 */}
        {activeTab === 'security' && (
          <div className="mt-8 relative">
            <div className="glass-card rounded-[2.5rem] p-12 flex flex-col items-center justify-center h-[50vh] border-dashed border-2 border-rose-500/20">
              <Shield className="w-20 h-20 text-rose-500/20 mb-6 animate-pulse" />
              <h2 className="text-2xl font-bold text-white mb-3">拦截与过滤黑洞分析</h2>
              <p className="text-gray-500 max-w-md text-center leading-relaxed">
                MosDNS V5 默认不区分阻断与放行日志。未来版本我们将增加专门的拦截特征识别算法并在此页为您提供广告/跟踪屏蔽排行榜。
              </p>
            </div>
          </div>
        )}

        {/* 全局聚合视图 */}
        {activeTab === 'global' && (
          <div className="mt-8 space-y-6">
            <h2 className="text-2xl font-bold text-white mb-6">流量特征深度聚合</h2>
            
            {/* 国内外双轨延迟微件 */}
            <RouteStatsCards routeStats={routeStats} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="glass-card rounded-[2rem] p-6 lg:p-8">
                <h3 className="text-gray-400 text-sm font-bold tracking-widest uppercase mb-6 flex items-center justify-between">
                  <span>Top 10 解析域名</span>
                  <Globe className="w-4 h-4 text-indigo-400" />
                </h3>
                <div className="h-[300px]">
                   <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={topDomains} layout="vertical" margin={{top: 0, right: 30, left: 40, bottom: 0}}>
                       <XAxis type="number" hide />
                       <YAxis dataKey="name" type="category" width={150} tick={{fill: '#9CA3AF', fontSize: 12}} axisLine={false} tickLine={false} />
                       <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{backgroundColor: '#1E1E2E', border: 'none', borderRadius: '12px', color: '#fff'}} />
                       <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
                     </BarChart>
                   </ResponsiveContainer>
                </div>
              </div>
              <div className="glass-card rounded-[2rem] p-6 lg:p-8">
                <h3 className="text-gray-400 text-sm font-bold tracking-widest uppercase mb-6 flex items-center justify-between">
                  <span>Top 10 客户端来源</span>
                  <Database className="w-4 h-4 text-emerald-400" />
                </h3>
                <div className="h-[300px]">
                   <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={topClients} layout="vertical" margin={{top: 0, right: 30, left: 40, bottom: 0}}>
                       <XAxis type="number" hide />
                       <YAxis dataKey="name" type="category" width={120} tick={{fill: '#9CA3AF', fontSize: 12}} axisLine={false} tickLine={false} />
                       <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{backgroundColor: '#1E1E2E', border: 'none', borderRadius: '12px', color: '#fff'}} />
                       <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                     </BarChart>
                   </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 极简提醒与数据库模块 */}
        {activeTab === 'database' && (
          <div className="glass-card rounded-[2.5rem] p-12 flex flex-col items-center justify-center h-[60vh] border-dashed border-2 border-emerald-500/20 mt-10">
            <Database className="w-20 h-20 text-emerald-500/20 mb-6 animate-pulse" />
            <h2 className="text-2xl font-bold text-white mb-3">实验性模块开发中</h2>
            <p className="text-gray-500 max-w-sm text-center leading-relaxed">
              此功能区正在紧锣密鼓地构建中，未来的版本更新将为您带来底层的持久化调优。
            </p>
          </div>
        )}

        {/* 仪表盘核心视图 */}
        {activeTab === 'dashboard' && (
          <div className="mt-8">
            {/* 关键统计指标 */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mb-8">
          <StatusCard 
            title="总查询量 (24H)" 
            value={status.query_total || 0} 
            desc="最近24小时累计解析总数" 
            icon={<Activity className="text-blue-400" />}
            color="blue"
          />
          <StatusCard 
            title="缓存命中率" 
            value={`${hitRate}%`} 
            desc="最近24小时整体命中占比" 
            icon={<Shield className="text-emerald-400" />}
            color="emerald"
          />
          <StatusCard 
            title="缓存容量" 
            value={status.cache_size || 0} 
            desc="当前缓存中的域名对象" 
            icon={<Database className="text-purple-400" />}
            color="purple"
          />
          <StatusCard 
            title="国内信道延迟" 
            value={`${routeStats?.cn?.avg_latency || 0} ms`} 
            desc="直连回国网络质量 (最近1H)" 
            icon={<Zap className="text-blue-400" />}
            color="blue"
          />
          <StatusCard 
            title="海外信道延迟" 
            value={`${routeStats?.proxy?.avg_latency || 0} ms`} 
            desc="抗污染代理网络质量 (最近1H)" 
            icon={<Globe className="text-indigo-400" />}
            color="amber"
          />
        </section>

        {/* 注入国内/外信道独立面板 */}
        <RouteStatsCards routeStats={routeStats} />

        {/* 图表与效率分析 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
          <div className="lg:col-span-2 glass-card rounded-[2rem] p-8 glow-purple">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Activity className="text-indigo-500 w-5 h-5" />
                请求趋势 (最近 {timeRange} 小时)
              </h3>
              <div className="flex gap-2">
                <button 
                  onClick={() => setTimeRange(1)} 
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${timeRange === 1 ? 'bg-indigo-500 text-white shadow-lg' : 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/30'}`}
                >
                  1H
                </button>
                <button 
                  onClick={() => setTimeRange(24)} 
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${timeRange === 24 ? 'bg-indigo-500 text-white shadow-lg' : 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/30'}`}
                >
                  24H
                </button>
              </div>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff08" />
                  <XAxis 
                    dataKey="timestamp" 
                    hide 
                  />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111', border: '1px solid #ffffff10', borderRadius: '12px' }}
                    itemStyle={{ color: '#6366f1' }}
                    labelFormatter={() => "流量快照"}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="query_total" 
                    stroke="#6366f1" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorTrend)" 
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card rounded-[2rem] p-8 flex flex-col justify-between overflow-hidden relative">
            <div className="absolute top-[-20px] right-[-20px] w-40 h-40 bg-indigo-500/10 blur-[60px] rounded-full"></div>
            <div>
              <h3 className="text-xl font-bold mb-2">解析效率</h3>
              <p className="text-gray-500 text-sm mb-6">本地缓存覆盖率与性能评估</p>
            </div>
            
            <div className="flex-1 flex flex-col justify-center items-center py-4">
              <div className="text-6xl font-black mb-2 tracking-tighter text-indigo-500">
                {hitRate}%
              </div>
              <div className="text-gray-400 text-sm font-bold uppercase tracking-[0.2em] mb-8">命中率</div>
              
              <div className="w-full space-y-4">
                 <ProgressRow label="缓存命中" percent={hitRate} color="bg-indigo-500" />
                 <ProgressRow label="外部递归" percent={100 - hitRate} color="bg-gray-700" />
              </div>
            </div>
            
            <div className="pt-6 border-t border-white/5 flex items-center justify-between text-xs text-gray-500">
              <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3" /> 运行状态良好</span>
              <ArrowUpRight className="w-4 h-4 cursor-pointer hover:text-white" />
            </div>
          </div>
        </div>

        {/* 实时审计日志 */}
        <section className="glass-card rounded-[2.5rem] overflow-hidden">
          <div className="px-8 py-6 border-b border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/[0.02]">
            <div>
              <h3 className="text-xl font-bold mb-1 italic">实时流量审计</h3>
              <p className="text-gray-500 text-xs uppercase tracking-widest">全局 DNS 解析事件流</p>
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="过滤域名或IP..." 
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors"
                />
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 text-gray-500 text-[10px] uppercase font-black tracking-widest">
                  <th className="px-8 py-4">状态与时间</th>
                  <th className="px-8 py-4">请求域名</th>
                  <th className="px-8 py-4">类型</th>
                  <th className="px-8 py-4">客户端 IP</th>
                  <th className="px-8 py-4 text-right pr-12">响应时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {logs
                  .filter(log => !searchQuery || log.domain.toLowerCase().includes(searchQuery.toLowerCase()) || log.client_ip.includes(searchQuery))
                  .map((log) => (
                  <tr key={log.id} className="group hover:bg-white/[0.03] transition-all cursor-default">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className={`w-2 h-2 rounded-full ${log.rcode === 'NOERROR' ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]'}`}></div>
                        <span className="text-xs font-mono text-gray-500">{new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold truncate max-w-[300px] text-white group-hover:text-indigo-400 transition-colors">{log.domain}</span>
                        <span className="text-[10px] text-gray-600 font-bold uppercase tracking-tighter mt-1">{log.rcode}</span>
                      </div>
                    </td>
                      <td className="px-8 py-6">
                      <div className="flex flex-col items-start gap-1">
                        <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-mono text-gray-400">{log.type || 'A'}</span>
                        <span className={`px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-wider ${log.route === 'proxy' ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : (log.route === 'cn' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400')}`}>
                          {log.route || 'cache'}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-gray-400 text-xs font-medium">
                        <div className="w-5 h-5 rounded-full bg-indigo-500/10 flex items-center justify-center">
                          <Hash className="w-3 h-3 text-indigo-500" />
                        </div>
                        {log.client_ip}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right pr-12">
                      <div className="flex flex-col items-end">
                        <span className={`text-sm font-bold ${log.latency_ms < 50 ? 'text-indigo-400' : 'text-gray-400'}`}>{log.latency_ms}ms</span>
                        <div className="w-16 h-1 bg-white/5 rounded-full mt-2 overflow-hidden">
                          <div 
                            className="h-full bg-indigo-500" 
                            style={{ width: `${Math.min(100, log.latency_ms / 2)}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-8 py-6 bg-white/[0.01] border-t border-white/5 flex justify-center">
             <button 
                onClick={loadMoreLogs}
                disabled={loadingMore}
                className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-indigo-400 transition-colors disabled:opacity-50"
             >
               {loadingMore ? <RefreshCw className="w-4 h-4 animate-spin" /> : '加载更多历史审计事件'} 
               {!loadingMore && <ChevronRight className="w-4 h-4" />}
             </button>
          </div>
        </section>
        </div>
        )}
      </main>
    </div>
  );
};

const StatusCard = ({ title, value, desc, icon, color }) => {
  const colorMap = {
    blue: "text-blue-400 bg-blue-400/5",
    emerald: "text-emerald-400 bg-emerald-400/5",
    purple: "text-purple-400 bg-purple-400/5",
    amber: "text-amber-400 bg-amber-400/5",
  };
  
  return (
    <div className="glass-card p-6 rounded-[1.5rem] hover:ring-1 hover:ring-white/10 transition-all group overflow-hidden relative">
      <div className={`absolute bottom-[-20%] left-[-10%] w-24 h-24 blur-[40px] opacity-0 group-hover:opacity-40 transition-opacity rounded-full bg-${color}-400/20`}></div>
      <div className="flex justify-between items-start mb-6">
        <div className={`p-3 rounded-2xl ${colorMap[color]}`}>{icon}</div>
        <div className="text-[10px] font-black text-gray-600 tracking-widest uppercase mb-1">实时</div>
      </div>
      <div className="mb-2">
        <h4 className="text-3xl font-black text-white tracking-tighter">{value}</h4>
        <p className="text-gray-600 font-bold text-[10px] uppercase tracking-widest mt-1">{title}</p>
      </div>
      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mt-4 underline decoration-white/5 underline-offset-4 pointer-events-none">
        {desc}
      </div>
    </div>
  );
};

const ProgressRow = ({ label, percent, color }) => (
  <div className="w-full">
    <div className="flex justify-between items-center mb-2 text-xs">
      <span className="text-gray-500 font-bold uppercase tracking-tighter">{label}</span>
      <span className="text-white font-black">{percent}%</span>
    </div>
    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
      <div 
        className={`h-full ${color} transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(99,102,241,0.3)]`} 
        style={{ width: `${percent}%` }}
      ></div>
    </div>
  </div>
);

const RouteStatsCards = ({ routeStats }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 mt-2">
    <div className="glass-card rounded-[2rem] p-6 lg:p-8 relative overflow-hidden group">
      <div className="absolute -right-6 -top-6 w-32 h-32 bg-blue-500/10 blur-[40px] rounded-full group-hover:bg-blue-500/20 transition-all"></div>
      <h3 className="text-gray-400 text-xs font-bold tracking-widest uppercase mb-6 flex items-center justify-between">
        <span>境内解析信道 (CN)</span>
        <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-pulse"></div>
      </h3>
      <div className="flex items-end justify-between">
        <div>
          <div className="text-4xl font-black text-white">{routeStats.cn.avg_latency || 0}<span className="text-sm text-gray-500 ml-1">ms</span></div>
          <div className="text-xs text-gray-500 mt-2">过去 1 小时平均返回延迟</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-blue-400">{routeStats.cn.req_count || 0}</div>
          <div className="text-[10px] text-gray-500 uppercase">Requests</div>
        </div>
      </div>
    </div>

    <div className="glass-card rounded-[2rem] p-6 lg:p-8 relative overflow-hidden group border-indigo-500/10">
      <div className="absolute -right-6 -top-6 w-32 h-32 bg-indigo-500/10 blur-[40px] rounded-full group-hover:bg-indigo-500/20 transition-all"></div>
      <h3 className="text-gray-400 text-xs font-bold tracking-widest uppercase mb-6 flex items-center justify-between">
        <span>海外代理信道 (PROXY)</span>
        <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)] animate-pulse"></div>
      </h3>
      <div className="flex items-end justify-between">
        <div>
          <div className="text-4xl font-black text-white">{routeStats.proxy.avg_latency || 0}<span className="text-sm text-gray-500 ml-1">ms</span></div>
          <div className="text-xs text-gray-500 mt-2">过去 1 小时平均返回延迟</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-indigo-400">{routeStats.proxy.req_count || 0}</div>
          <div className="text-[10px] text-gray-500 uppercase">Requests</div>
        </div>
      </div>
    </div>

    <div className="glass-card rounded-[2rem] p-6 lg:p-8 relative overflow-hidden group hidden md:block lg:flex flex-col justify-between">
      <div className="absolute -right-6 -top-6 w-32 h-32 bg-emerald-500/10 blur-[40px] rounded-full group-hover:bg-emerald-500/20 transition-all"></div>
      <h3 className="text-gray-400 text-xs font-bold tracking-widest uppercase mb-6 flex items-center justify-between">
        <span>本地高速缓存 (CACHE)</span>
        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div>
      </h3>
      <div className="flex items-end justify-between">
        <div>
          <div className="text-4xl font-black text-white">{routeStats.cache.avg_latency || 0}<span className="text-sm text-gray-500 ml-1">ms</span></div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-emerald-400">{routeStats.cache.req_count || 0}</div>
          <div className="text-[10px] text-gray-500 uppercase">Hits</div>
        </div>
      </div>
    </div>
  </div>
);

export default Dashboard;
