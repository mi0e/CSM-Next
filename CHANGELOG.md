# Changelog

本项目遵循语义化版本。尚未发布的改动记录在 `Unreleased`。

## Unreleased

- 建立可开源维护的标准目录结构和无依赖构建流程。
- 精简节点详情规格区，移除虚拟化、GPU 与内核附注。
- 支持 Cloudflare Workers Builds 直接连接 Git 仓库自动部署。
- 修复 Workers Static Assets 将首页跳转到 `/pages/` 后样式路径失效的问题。
- 将监控后端地址改为 Cloudflare 控制台运行时变量，仓库不再保存维护者地址。

## 0.1.0 - 2026-07-16

- CSM-Next 仪表盘、筛选、网格与表格视图。
- 独立节点详情页、Load/Ping 图表和悬浮数据提示。
- WebSocket 实时更新及轮询兜底。
- 中英文、明暗主题和响应式布局。
- 扁平 SVG 国旗与 Cloudflare Pages 部署支持。
