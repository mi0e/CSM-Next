# Architecture

## 数据流

```text
Cloudflare Worker / 静态托管主题
  ├─ GET /api/config
  ├─ GET /api/servers
  ├─ GET /api/server?id=...
  ├─ GET /api/history/all?id=...&hours=...
  └─ WebSocket /api/ws
           ↓
CF-Server-Monitor Worker / D1 / Durable Object
```

主题是纯静态前端，不包含代理层，也不保存管理凭据。管理后台继续由原 Worker 提供。

通过 Cloudflare Workers 部署时，`worker/index.js` 只负责首页、详情页和 `config.json` 路由；CSS、JavaScript 等文件由 Workers Static Assets 直接提供。它不会代理监控 API。

## 目录职责

- `src/index.html`、`src/detail.html`：HTML 页面入口。
- `src/assets/js/`：仪表盘与详情页逻辑。
- `src/assets/css/`：共享样式与详情页样式。
- `worker/`：Cloudflare Worker 路由和运行时前端配置。
- `config/`：公开示例配置和被忽略的本地配置。
- `tests/`：无需浏览器依赖的 DOM 冒烟测试。
- `scripts/`：构建与本地静态服务。
- `docs/`：架构、开发和部署说明。
- `dist/`：构建产物，不提交 Git。
- `wrangler.jsonc`：Workers Static Assets 与部署变量。

## 配置策略

普通静态构建优先读取 `config/config.local.json`；若不存在，则使用 `config/config.example.json`。Cloudflare Worker 部署从控制台运行时变量生成 `/config.json`，本地 Wrangler 则读取被 Git 忽略的 `.dev.vars`，两者都不依赖 `dist/`。

## 权限边界

- 公开页面可读取服务器列表、详情及后端允许的历史范围。
- 超过 1 小时的历史可能需要原管理端登录。
- 管理 API、JWT 和 Turnstile Secret 不属于主题源码。
