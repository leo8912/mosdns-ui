## Mosdns v4 -> Mosdns-x

### 功能变化

- 新增 DoQ 监听
- 新增 DoQ 上游
- 新增 DoH3 监听
- 新增 DoH3 上游
- 支持 KTLS (DoT/DoH)
- 支持 Unix Domain Socket 监听
- 端口复用优化
- 自动处理 HTTP 头获取用户 IP
- SSL 证书自动重载
- 新增 ANY 记录屏蔽插件
- 自动拦截格式错误的请求
- 移除 dnsproxy 插件
- 优化 fast_forward 插件 (配置项有改动)
- 增强上游 SOCKS5 代理中转功能 (支持全 DNS 协议及用户认证)
- 自动将日志中的 IPv4-in-IPv6 地址转换为 IPv4 格式
- 升级依赖版本

### 配置兼容

- `forward` 插件: 移除
- `fast_forward` 插件: 

   移除 `enable_http3` 参数，变更为使用独立协议 `h3://`

   重命名 `insecure_skip_verify` 参数，变更为 `insecure`

---

## Changelog

### [v26.02.27](https://github.com/pmkol/mosdns-x/releases/tag/v26.02.27)
- 修复 \_response\_valid\_answer 插件判断 CNAME 异常的问题
- 修复 SSL 证书自动重载在长期运行情况下可能失效的问题

### [v26.01.20](https://github.com/pmkol/mosdns-x/releases/tag/v26.01.20)
- 修复 \_no\_cname 插件在部分情况下处理 CNAME 异常的问题

### [v26.01.18](https://github.com/pmkol/mosdns-x/releases/tag/v26.01.18)
- 修复 Golang 1.25.6 引起的 Quic 性能问题
- 新增 \_no\_cname 插件，删除应答中的 CNAME 记录

### [v26.01.17](https://github.com/pmkol/mosdns-x/releases/tag/v26.01.17)
- 提升 SSL 证书自动重载的稳定性
- 升级依赖

### [v25.12.05](https://github.com/pmkol/mosdns-x/releases/tag/v25.12.05)
- 增加 DoH 转发的兼容性
- 优化 GC 内存回收性能
- 升级依赖

### [v25.11.11](https://github.com/pmkol/mosdns-x/releases/tag/v25.11.11)
- 增加 TLS 监听兼容性，启用全部安全加密套件与完整曲线支持
- 升级依赖

### [v25.10.08](https://github.com/pmkol/mosdns-x/releases/tag/v25.10.08)
- 提升 DoH3 转发的稳定性
- 升级依赖

### [v25.09.22](https://github.com/pmkol/mosdns-x/releases/tag/v25.09.22)
- 增加 DoH 监听的兼容性，放宽 POST 请求的验证规则
- 提升 DoT 监听的稳定性，重构 TCP 监听模块
- 修复 Hosts 插件随机打乱IP顺序功能异常
- 升级 Golang 至 1.25 版本
- 升级依赖

### [v25.09.03](https://github.com/pmkol/mosdns-x/releases/tag/v25.09.03)
- fast_forward 优化使用 UDP 并发请求上游时的内存占用
- query_summary 在日志信息中增加请求协议与域名（需开启该插件）

### [v25.08.20](https://github.com/pmkol/mosdns-x/releases/tag/v25.08.20)
- 修复部分 Linux 系统中无法使用 Unix Domain Socket 监听的问题

### [v25.08.15](https://github.com/pmkol/mosdns-x/releases/tag/v25.08.15)
- 修复 DoH/DoH3 监听日志 Client IP 显示异常
- 自动拦截格式错误的请求
- 增强上游 SOCKS5 代理中转功能 (支持全 DNS 协议及用户认证)
- 自动将日志中的 IPv4-in-IPv6 地址转换为 IPv4 格式

### [v25.08.11](https://github.com/pmkol/mosdns-x/releases/tag/v25.08.11)
- 新增 DoQ 监听
- 新增 DoQ 上游
- 新增 DoH3 监听
- 新增 DoH3 上游
- 支持 KTLS (DoT/DoH)
- 支持 Unix Domain Socket 监听
- 端口复用优化
- 自动处理 HTTP 头获取用户 IP
- SSL 证书自动重载
- 新增 ANY 记录屏蔽插件
- 移除 dnsproxy 插件
- 优化 fast_forward 插件 (配置项有改动)
- 升级依赖版本
