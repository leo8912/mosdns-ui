## 基本配置文件格式

Mosdns-x 的默认配置文件格式是 yaml，本 wiki 中所有示例均为 yaml 格式。

Mosdns-x 也支持 JSON, TOML 格式的配置文件。Mosdns-x 会根据配置文件后缀自动识别配置格式。

```yaml
# 日志设置
log:
  level: info                   # 日志级别。可选 "debug" "info" "warn" "error"。默认 "info"。
  file: "/path/to/log/file"     # 记录日志到文件。

# 从其他配置文件载入 include，数据源，插件和服务器设置
# include 的设置会比本配置文件中的设置先被初始化
include: []

# 数据源设置
data_providers:
  - tag: data1                  # 数据源的 tag。由用户自由设定。不能重复。
    file: "/path/to/data/file"  # 文件位置
    auto_reload: false          # 文件有变化时是否自动重载。

# 插件设置
plugins:
  - tag: tag1                   # 插件的 tag。由用户自由设定。不能重复。
    type: type1                 # 插件类型。详见下文。
    args:                       # 插件参数。取决于插件类型。详见下文。
      key1: value1
      key2: value2

# 服务器设置
servers:
  - exec: plugin_tag1           # 本服务器运行插件的 tag。
    timeout: 5                  # 请求处理超时时间。单位: 秒。默认: 5。
    listeners:                  # 监听设置。是数组。可配置多个。
      - protocol: https           # 协议，支持 "udp", "tcp", "quic", "tls", "h3", "https", "http" 协议。
        addr: ":443"              # 监听地址。支持 Unix Domain Socket 地址，需开启 uds 选项。
        uds: false                # 使用 Unix Domain Socket 监听地址。
        idle_timeout: 10          # 连接复用空连接超时时间。单位: 秒。默认 DoQ/DoH3: 30 ，TCP/DoT/DoH: 10。
        cert: "/path/to/my/cert"  # TLS 所需证书文件。支持自动重载。
        key: "/path/to/my/key"    # TLS 所需密钥文件。支持自动重载。
        url_path: "/dns-query"    # DoH 路径。留空会跳过路径检查，任何请求路径会被处理。
        # DoH/DoH3 从指定 HTTP 头获取用户 IP。需配合反向代理使用。默认会优先从标准 HTTP 头自动获取用户 IP。
        get_user_ip_from_header: "X-Forwarded-For"
        # 启用 proxy protocol。需配合反向代理使用。不支持 UDP 服务器。
        proxy_protocol: false
        # DoT/DoH 使用 KTLS 内核级加密数据发送优化。需要 Linux Kernel 5.3+ ，必须确定系统支持后再启用该选项。
        kernel_tx: false
        # DoT/DoH 使用 KTLS 内核级加密数据接收优化。需要 Linux Kernel 5.9+ ，可能会负优化，仅建议熟悉内核的用户使用。
        kernel_rx: false

      - protocol: udp
        addr: ":53"
      - protocol: tcp
        addr: ":53"
# API 入口设置     
api:
    http: "127.0.0.1:9080" # 在该地址启动 api 接口。
```

> ℹ️ 证书/密钥/数据源文件自动重载注意事项:
>
> 该功能依赖文件系统的通知，非轮询。仅部分系统和文件系统可用。一般来说 Windows, Linux, BSD 和 macOS 上常见的文件系统均可用，网络文件系统除外。详见 [fsnotify](https://github.com/fsnotify/fsnotify) 。
>
> 若检测到证书/密钥文件被删除，则继续使用之前的文件。
>
> 若检测到数据源文件被删除，一秒后没有相同文件名的文件被创建，则停止自动重载。

**插件设置:**

可用的插件类型 `type` 和其对应的 `args` 参数设置，详见 [插件及其参数](./插件及其参数.md)

**服务器设置:**

协议在配置文件中使用 scheme 表示

| 协议   | UDP   | TCP   | DoQ   | DoT   | DoH3  | DoH   | HTTP  |
|--------|-------|-------|-------|-------|-------|-------|-------|
| scheme | udp   | tcp   | quic  | tls   | h3    | https | http  |

**API 说明:**

详见 [管理员 API](./管理员-API.md)

---

## 配置示例

绝大多数 Mosdns-x 的配置都遵循一个思路:

* servers 接受来自用户的请求。转给 plugins 处理。
* 用 sequence 插件定义请求处理逻辑。生成/获取应答。
* data\_providers 为某些 plugin 提供所需数据。

<details>

<summary>简单转发器: 将不加密的 DNS53 通过 DoH 转发。点击展开</summary>

```yaml
log:
  level: info
  file: ""

plugins:
  # 转发至 Google 服务器的插件
  - tag: forward_google
    type: fast_forward
    args:
      upstream:
        - addr: https://8.8.8.8/dns-query

servers:
  - exec: forward_google
    listeners:
      - protocol: udp
        addr: 127.0.0.1:5533
      - protocol: tcp
        addr: 127.0.0.1:5533
```

</details>

<details>

<summary>多功能转发器: 缓存加速，屏蔽广告。点击展开</summary>

这个配置文件

* 有缓存，可加速域名解析速度。
* 会屏蔽广告域名。
* 将请求转发至 Google DoH 解析。

用户可以用 `sequence` 插件将多个插件按顺序组合，组成自己想要的运行逻辑。比如下文的配置利用 `if` 屏蔽广告域名。

示例中的广告列表 oisd\_dbl\_basic.txt 来自 [oisd.nl](https://oisd.nl) (官网首页)。下载地址: [https://dbl.oisd.nl/basic/](https://dbl.oisd.nl/basic/) 。

Mosdns-x 的域名匹配器非常高效，即使匹配数以百万的域名也不会影响性能。

```yaml
log:
  level: info

data_providers:
  - tag: oisd_dbl_basic
    file: ./oisd_dbl_basic.txt

plugins:
  - tag: cache
    type: cache
    args:
      size: 1024

  - tag: forward_google
    type: fast_forward
    args:
      upstream:
        - addr: https://8.8.8.8/dns-query

  - tag: query_is_ad_domain
    type: query_matcher
    args:
      domain:
        - 'provider:oisd_dbl_basic'

  - tag: my_sequence
    type: sequence
    args:
      exec:
        # 缓存
        - cache

        # 如果匹配到广告域名
        - if: query_is_ad_domain
          exec:
            - _new_nxdomain_response # 生成 NXDOMAIN 应答
            - _return                # 立刻返回 (结束本序列)

        # 转发至 Google 获取应答
        - forward_google

servers:
  - exec: my_sequence
    listeners:
      - protocol: udp
        addr: 127.0.0.1:5533
      - protocol: tcp
        addr: 127.0.0.1:5533
```

</details>
