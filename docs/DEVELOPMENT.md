# Development

## 环境

- Node.js 18 或更高版本
- 无第三方 npm 运行依赖

## 首次配置

复制示例配置：

```powershell
Copy-Item .\config\config.example.json .\config\config.local.json
```

编辑 `config/config.local.json`，填入自己的 Worker 地址。

## 常用命令

```powershell
npm test          # 仪表盘和详情页冒烟测试
npm run build     # 生成 dist/
npm run dev       # 构建并启动 http://127.0.0.1:4173
npm run preview   # 直接预览已有 dist/
npm run clean     # 删除构建产物
npm run cf:dev    # 使用 Wrangler 预览 Worker 路由
npm run cf:deploy # 部署到 Cloudflare Workers
```

预览模拟数据：

```text
http://127.0.0.1:4173/?preview=1
http://127.0.0.1:4173/admin.html?preview=1
```

## 修改位置

- 仪表盘：`src/index.html`、`src/assets/js/dashboard.js`
- 详情页：`src/detail.html`、`src/assets/js/detail.js`
- 登录授权：`src/assets/js/shared/login.js` 与首页/详情页登录弹窗
- 主题自定义：`src/assets/js/shared/theme.js`、`theme-settings.js`，首页右侧抽屉与 Worker KV 接口
- 首页探针历史：`src/assets/js/shared/probe-history.js` 负责一小时窗口清洗、合并与 24 桶聚合，`dashboard.js` 负责视口懒加载和 WebSocket 增量
- 可选主题后台：`src/admin.html`、`src/assets/js/admin.js`（入口）、`src/assets/js/admin/`（`i18n` / `context` / `api` / `servers` / `settings`）、`src/assets/css/admin.css`；生产环境默认关闭
- 共享模块：`src/assets/js/shared/`（`auth` / `http` / `theme` / `title` / `url` / `dom` / `i18n` / `ping` / `probe-history`）
- 公共样式：`src/assets/css/main.css`
- 详情样式：`src/assets/css/detail.css`
- Worker 路由：`worker/index.js`、`wrangler.jsonc`

提交前必须运行测试和构建，并确认 `dist/` 与本地配置没有进入 Git。

## Commit 消息

遵循 `CONTRIBUTING.md` 中的约定：`type: summary`，例如 `fix: ...`、`docs: ...`、`refactor: ...`。语言不限，前缀必填。

