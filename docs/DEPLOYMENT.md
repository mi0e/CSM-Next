# 部署

CSM-Next 是纯静态主题,有两种部署方式,可同时启用。日常维护两者的差异与发布节奏见 `docs/MAINTENANCE.md`。

## 方式一:上游主题商店(推荐,零配置)

要求 CF-Server-Monitor ≥ 2.7.13 Beta5(带主题商店功能)。

1. 主题维护者执行 `npm run release:theme && git push origin theme-dist`,把商店产物发布到 `theme-dist` 分支。
2. 站长打开自己探针的上游后台(`/admin#admin`)→ **主题商店**。
3. 在「自定义主题」输入框填:

   ```text
   https://github.com/mi0e/CSM-Next/tree/theme-dist
   ```

4. 点「预览」确认效果,再点「应用」。

完成。主题与后端同源:不需要配置 API 地址、不需要 CORS、上游后台登录态直接复用。站点标题、背景、自定义脚本继续在上游后台「外观设置」里管理;想把主题抽屉里调好的效果设为全站默认,用抽屉的「复制站点配置」按钮,把片段粘贴到上游后台的「自定义脚本」。

注意事项:

- 上游对主题文件有 1 小时缓存,更新主题后访客端最多延迟 1 小时;后台重新应用可即时刷新。
- 外域背景图需要站长在上游后台 CSP 设置(`csp_static`)中放行对应域名。

## 方式二:独立静态部署

产物是标准静态文件(`dist/`),任何静态托管都能跑。跨域部署必须:

- 页面内有 `<meta name="apiBase" content="https://你的监控worker地址">`(多个用英文逗号分隔)——由 `config/config.local.json` 在构建时注入,或部署后手改 `index.html`。
- 每个上游 Worker 的环境变量 `CORS_ALLOWED_ORIGINS` 加入主题域名(只填 origin,逗号分隔,不带路径和结尾斜杠)。

### Cloudflare Workers Builds(Git 集成)

1. 打开 **Workers & Pages** → **Create application** → **Import a repository**,选择 CSM-Next 仓库。
2. Worker 名称 `csm-next`,生产分支 `main`。
3. **Build command** 填 `npm run build`。
4. **Deploy command** 保持 `npx wrangler deploy`。
5. Root directory:仓库根即 CSM-Next 时留空。
6. **Save and Deploy**。

`wrangler.jsonc` 已声明纯静态资产部署(`assets.directory = ./dist`,无 Worker 代码、无 KV)。此后每次推送 `main` 自动发布。

`config.local.json` 不进 Git,CI 构建时通过**构建环境变量**注入后端地址(与上游静态主题构建同名约定):在 Worker 的 **Settings → Build → Variables and Secrets** 添加:

| 变量 | 说明 |
| --- | --- |
| `API_BASE` | 必填(跨域部署时)。监控 Worker 地址,多个用英文逗号分隔,构建时写入 `<meta name="apiBase">` |
| `TITLE` | 选填。写入 `<title>` 作为标题兜底 |
| `REFRESH_INTERVAL` | 选填。轮询间隔毫秒 |

同源部署(主题与监控 Worker 同一域名)则什么都不用配。

### 从旧版部署升级(重要)

老版本(自带 Worker + KV)的 `csm-next` 应用**不需要删除**:推送新代码后同一个 Worker 会被重新部署为纯静态资产。但必须做两件事:

1. 在 Cloudflare 控制台把 **Build command** 从空改为 `npm run build`(老版本直接托管 `src/`,新版本需要构建 `dist/`),并按上表添加 `API_BASE` 构建变量。
2. 旧的运行时变量(`CSM_API_BASE`、`CSM_SITE_TITLE` 等)与 `THEME_SETTINGS` KV namespace 不再被读取。想保留旧的全站主题设置,升级前先记下抽屉里的配置(或升级后重新调一遍并「复制站点配置」到上游后台);之后可在 **Storage & Databases → KV** 删除该 namespace、在 Worker 设置里删除旧变量。留着也无害,只是闲置。

如果你只打算走主题商店模式,也可以直接删除整个 `csm-next` Worker——商店模式完全不依赖这个独立部署。

### 其他静态托管(Pages / GitHub Pages / 任意)

本地 `npm run build` 后把 `dist/` 交给托管平台即可。GitHub Pages 用户同样确保 meta apiBase 与上游 CORS 配置到位。

## 从旧版本(≤0.1.0 自带 Worker 架构)迁移

旧架构的自有 Worker、KV 主题设置与实验性 admin 已移除:

- **KV 里的主题设置不再被读取**。迁移方法:部署新版后在抽屉里重新调一遍样式 → 「复制站点配置」→ 粘贴到上游后台「自定义脚本」,即可恢复全站默认外观。
- **上传到 KV 的背景图失效**。把图片换成外链 URL(注意 CSP 放行),或提交到主题仓库 `src/assets/` 随主题分发。
- 旧的 `CSM_*` 环境变量与 `THEME_SETTINGS` KV binding 不再使用,可在 Cloudflare 控制台删除。
- 旧收藏链接 `detail.html?id=...` 会自动跳转到新地址 `#/server/...`。
