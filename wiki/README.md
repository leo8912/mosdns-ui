# Mosdns-x Wiki

版本: [v26.02.27](https://github.com/pmkol/mosdns-x/releases/tag/v26.02.27)

## 功能概述

Mosdns-x 是一个插件化的 DNS 转发器。用户可以按需拼接插件，定制自己的 DNS 处理逻辑。

---

## 插件概述

以下是 Mosdns-x 以及自带插件的功能:

* 匹配器:
  * `query_matcher`: 匹配请求的特性。域名，类型，来源 IP 等。
  * `response_matcher`: 匹配应答的特性。应答 IP，CNAME 等。
* 常用功能:
  * `fast_forward`: 转发请求至上游服务器。
  * `cache`: 缓存应答。支持 redis 外部缓存。
  * `_prefer_ipv4/6`: 自动判断域名是否是双栈域名然后屏蔽 IPv4/6 请求，不会影响纯 IPv6/4 域名。
  * `ecs`: 在请求上附加 ECS。可以是预设 IP 也可以自动使用客户端的 IP。
  * `hosts`: 为域名设定 IP。
  * `blackhole`: 能丢弃应答，生成空应答，或者生成包含特定 IP 应答。用于屏蔽请求。
  * `ttl`: 修改应答的 TTL。
  * `redirect`: 替换(重定向)请求的域名。请求域名 A，但返回域名 B 的记录。
  * `padding`: 将加密 DNS 的报文填充至固定长度，防止流量分析。
  * `bufsize`: 修改请求的 EDNS0 的 UDP Size。防止 UDP 碎片。
  * `arbitrary`: 面向高级用户。可以手动构建包含任意记录的应答。
  * `reverse_lookup` : 可通过 IP 反查经过 Mosdns-x 处理的域名。支持处理 PTR 请求，支持通过 HTTP 接口查询。
  * `client_limiter`: 限制客户端的最大 QPS。
* 动态路由
  * `ipset`: 将应答 IP 写入 ipset。
  * `nftset`: 将应答 IP 写入 nftables。

插件详细说明在
[插件及其参数](./插件及其参数.md)

还可以添加自己编写的插件到 Mosdns-x 内。详见
[新插件编写](./新插件编写.md)

---

## 如何配置

配置说明和示例，详见
[配置说明](./Mosdns‐x-配置说明.md)

---

## 如何使用

Mosdns-x 只有一个二进制文件，命令行运行即可。

```bash
mosdns start -c config_file -d working_dir​
```

Mosdns-x 还附带一些常用小工具命令。

* probe 可以探测 TCP/TLS 服务器是否支持连接复用，pipeline 连接复用，空闲连接保持时间。
* config 可以生成 yaml 配置文件模板，转换配置文件格式。
* service 可以将 Mosdns-x 安装成系统服务。

详见各个子命令的帮助。

```bash
mosdns -h
mosdns probe -h
```

### 安装至系统服务

mosdns service 是一个简单的系统服务管理工具。可将 Mosdns-x 安装成系统服务实现自启。需要管理员或 root 权限。理论上可用于 Windows XP+, Linux/(systemd | Upstart | SysV), 和 OSX/Launchd 平台。Windows，Ubuntu，Debian 实测可用。Openwrt 不可用。

```bash
# 安装服务
mosdns service install -d 工作目录绝对路径 -c 配置文件路径
# 安装成功后手动运行服务。(服务仅设定为随系统自启，安装成功后并不会马上自动运行)
mosdns service start

# 卸载
mosdns service stop
mosdns service uninstall
```

### Docker 镜像升级

Mosdns-x 不提供 Docker 镜像。不推荐通过 Docker 部署服务。

Docker 用户可以升级 `mosdns:v4.5.3` 镜像内文件进行部署，升级前需要将 Mosdns-x 的二进制文件 `mosdns` 与配置文件 `config.yaml` 上传至宿主机工作目录，例如 `/opt/mosdns` 为工作目录绝对路径。

```bash
# 运行指定镜像 (示例: 宿主机监听 5553 端口，配置文件监听 53 端口)
docker run -d --name mosdns -p 5553:53/udp -p 5553:53/tcp -v /opt/mosdns:/etc/mosdns irinesistiana/mosdns:v4.5.3

# 升级镜像内文件 (示例: 二进制文件与配置文件已上传至 /opt/mosdns 目录)
docker cp /opt/mosdns/mosdns mosdns:/usr/bin/mosdns

# 重新启动镜像
docker restart mosdns

# 查看升级后版本
docker exec mosdns mosdns version

# 升级成功后删除位于宿主机的二进制文件
rm -f /opt/mosdns/mosdns

# 卸载镜像
docker stop mosdns
docker rm mosdns
docker rmi irinesistiana/mosdns:v4.5.3
```

---

## 关联项目

### [easymosdns](https://github.com/pmkol/easymosdns)

适用于 Linux 的辅助脚本。借助 Mosdns-x，仅需几分钟即可搭建一台支持 ECS 的无污染 DNS 服务器。内置中国大陆地区的优化规则，满足DNS日常使用场景，开箱即用。

### [mosdns-v4](https://github.com/IrineSistiana/mosdns/tree/v4)

一个插件化的 DNS 转发器。是 Mosdns-x 的上游项目。