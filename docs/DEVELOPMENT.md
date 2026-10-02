# Development

## 环境

- Node.js 18 或更高版本
- 无第三方 npm 运行依赖(wrangler 仅用于独立部署预览)

## 首次配置

本地连真实后端时复制示例配置:

```powershell
Copy-Item .\config\config.example.json .\config\config.local.json
```

编辑 `config/config.local.json` 填入自己的 Worker 地址。构建时该文件会被写入 `dist/index.html` 的 `<meta name="apiBase">` 与 `<title>`(它不进 Git;商店发布 `npm run release:theme` 会忽略它)。只用 `?preview=1` 模拟数据开发则无需此步。

## 常用命令

```powershell
npm test                # node --test,自动发现 tests/*.test.mjs
npm run build           # 生成 dist/
npm run dev             # 构建并启动 http://127.0.0.1:4173
npm run preview         # 直接预览已有 dist/
npm run clean           # 删除构建产物
npm run release:theme   # 商店版产物提交到 theme-dist 分支(手动 push)
npm run cf:dev          # Wrangler 本地预览静态资产部署
npm run cf:deploy       # 手动部署到 Cloudflare Workers 静态资产
```

预览模拟数据:

```text
http://127.0.0.1:4173/?preview=1
http://127.0.0.1:4173/?preview=1#/server/preview-2
```

本地预览的旗帜图标由 `scripts/serve.mjs` 代理到上游仓库,失败时页面自动回退文字区域码。

## 修改位置

- 路由/视图挂载:`src/assets/js/app.js`、`src/assets/js/shared/route.js`
- 仪表盘视图:`src/index.html` 的 `<template id="viewDashboard">`、`src/assets/js/dashboard.js`
- 详情视图:`src/index.html` 的 `<template id="viewServerDetail">`、`src/assets/js/detail.js`
- 登录授权:`src/assets/js/shared/login.js` 与两个视图内的登录弹窗
- 主题自定义:`src/assets/js/shared/theme.js`(两层持久化 + 导出)、`theme-settings.js`(校验),抽屉 UI 在 dashboard 模板中
- 旗帜:`src/assets/js/shared/flags.js`
- 首页探针历史:`src/assets/js/shared/probe-history.js`(上游紧凑 `ping` / `loss` 窗口转换与动态聚合),`dashboard.js`(复用 `/api/servers` 内嵌窗口并合并 WebSocket 末块,不额外请求历史接口)
- 共享模块:`src/assets/js/shared/`
- 公共样式:`src/assets/css/main.css`;详情样式:`src/assets/css/detail.css`
- 构建/发布:`scripts/build.mjs`、`scripts/release-theme.mjs`

新增页面时**不要**添加 `.html` 文件——上游商店模式只认 `index.html`。正确做法:加 hash 路由 + `<template>` + 视图模块(参考 `docs/MAINTENANCE.md` 的约定红线)。

提交前必须运行测试和构建,并确认 `dist/` 与本地配置没有进入 Git。

## Commit 消息

遵循 `CONTRIBUTING.md` 中的约定:`type: summary`,例如 `fix: ...`、`docs: ...`、`refactor: ...`。语言不限,前缀必填。
