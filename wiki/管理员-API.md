**所有 API 目前都是实验性的。不保证稳定性和不变性。**

使用 API 需在配置中设置 api.http 的地址。

参考 [配置说明](./Mosdns‐x-配置说明.md)

---

## 插件 API

插件 API 的入口为 `http://<api_addr>/plugins/<plugin_tag>`。

参数取决于插件。目前自带插件仅 `reverse_lookup` 支持 API，用户可参考该插件开发。

## Prometheus Metrics API

Prometheus API 的入口为 `http://<api_addr>/metrics`。包含一些默认数据项。部分插件会添加新数据项。

## pppof 性能分析工具

pprof 位于 `http://<api_addr>/debug/pprof/` 。

使用方式详见 [诊断内存与性能问题](./诊断内存与性能问题.md)