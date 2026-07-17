# Architecture

## 数据流

```text
CSM-Next Cloudflare Worker / 静态托管主题
  ├─ GET /api/theme-settings → CSM-Next KV
  ├─ PUT /api/theme-settings → 验证上游 JWT → CSM-Next KV
  ├─ GET/PUT /api/theme-background → CSM-Next KV
  ├─ GET /api/config
  ├─ GET /api/servers
  ├─ GET /api/server?id=...
  ├─ GET /api/history/all?id=...&hours=...
  └─ WebSocket /api/ws
           ↓
CF-Server-Monitor Worker / D1 / Durable Object
```

监控页面仍是静态前端，不保存管理密码。Cloudflare 部署额外提供一个很小的主题设置 API：KV 保存外观 JSON 与单张背景图片，写入前通过上游 JWT 验证身份。外观 JSON 分别保存透明化开关、柔和/毛玻璃模式、面板不透明度与模糊强度；旧版只有 `panelOpacity` 的数据会兼容迁移为原有毛玻璃效果。默认管理入口跳转原 CF-Server-Monitor 的 `/#/admin`；设置 `customAdminEnabled` 后才启用实验性 `admin.html`。主题设置不改上游 D1 / Worker 核心逻辑。

首页探针时间条只为进入视口的节点按需请求 `hours=1` 历史，同时最多加载 4 个节点。每个节点在当前页面只初始化一次，并在浏览器会话中短时缓存；随后利用已有 WebSocket 样本维护滚动一小时窗口，普通 60 秒刷新不会重复读取历史。每个时间条由 24 个真实时间桶组成，缺少采样的桶显示为空，不用当前值重复填充。

通过 Cloudflare Workers 部署时，`worker/index.js` 负责页面路由、`config.json`、主题设置和背景图片接口；CSS、JavaScript 等文件由 Workers Static Assets 直接提供。它不会代理监控数据 API，认证探测也不会返回上游设置或 Secret。

## 目录职责

- `src/index.html`、`src/detail.html`：默认页面入口；`src/admin.html` 是开关控制的可选实验后台。
- `src/assets/js/`：仪表盘、详情页与管理后台入口逻辑。
- `src/assets/js/admin/`：管理后台分域模块（i18n / context / api / servers / settings）。
- `src/assets/js/shared/`：跨页共享模块（JWT、HTTP、主题设置、URL/背景图校验、DOM 转义、i18n、测点字段与探针历史聚合）。
- `src/assets/css/`：共享样式、详情页与后台样式。
- `worker/`：Cloudflare Worker 路由、运行时配置与 KV 主题设置接口。
- `config/`：公开示例配置和被忽略的本地配置。
- `tests/`：无需浏览器依赖的 DOM 冒烟测试。
- `scripts/`：构建与本地静态服务。
- `docs/`：架构、开发和部署说明。
- `dist/`：构建产物，不提交 Git。
- `wrangler.jsonc`：Workers Static Assets、自动配置的 KV binding 与部署变量。

## 配置策略

普通静态构建优先读取 `config/config.local.json`；若不存在，则使用 `config/config.example.json`。Cloudflare Worker 部署从控制台运行时变量生成 `/config.json`，本地 Wrangler 则读取被 Git 忽略的 `.dev.vars`，两者都不依赖 `dist/`。

## 权限边界

- 公开页面可读取服务器列表、详情及后端允许的历史范围。
- 超过 1 小时的历史需要 JWT。后端只认 `Authorization: Bearer`，不读 Cookie。
- JWT 保存在浏览器 `localStorage`，按域名隔离。主题与原管理端不在同一域名时，原后台登录状态不会自动穿透。
- 首页、详情页与可选主题后台在本主题域名登录：调用原 `/admin/api` 获取 token，写入当前域名 `localStorage`（按 `apiBase` 隔离）。
- 主题设置公开读取；写设置和上传背景必须携带 JWT。Worker 只用未知 action 验证令牌，不调用 `get_settings`，也不读取上游 Secret。
- 自定义 CSS 通过 `textContent` 写入固定 `<style>`，同时拒绝外部资源 URL、`@import` 与样式标签注入。
- 管理 API、JWT Secret 和 Turnstile Secret 不属于主题源码；主题后台只消费原接口，不增加 D1 读写策略。

