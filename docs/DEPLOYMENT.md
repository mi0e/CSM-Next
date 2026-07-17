# 部署到 Cloudflare Workers

CSM-Next 使用 Cloudflare Workers Builds 的 Git 集成。Cloudflare 直接从仓库发布页面，不需要 GitHub Actions，也不需要上传 `dist/`。

## 第一次部署

先把 `CSM-Next` 作为仓库根目录推送到 GitHub 或 GitLab，然后在 Cloudflare 中操作：

1. 打开 **Workers & Pages**。
2. 选择 **Create application**。
3. 在 **Import a repository** 旁选择 **Get started**。
4. 授权 GitHub 或 GitLab，并选择 CSM-Next 仓库。
5. Worker 名称填写 `csm-next`。
6. 生产分支选择 `main`。
7. **Build command** 留空。
8. **Deploy command** 保持 `npx wrangler deploy`。
9. 如果 CSM-Next 就是仓库根目录，**Root directory** 留空；如果整个工作区是一个仓库，则填写 `CSM-Next`。
10. 选择 **Save and Deploy**。

`wrangler.jsonc` 已经指定 Worker 入口和静态资源目录，默认部署命令会直接完成发布。之后每次推送到 `main`，Cloudflare 都会自动构建并更新线上 Worker。

配置文件还声明了不带 ID 的 `THEME_SETTINGS` KV binding。Wrangler 的自动资源配置会在首次部署时创建并绑定 namespace；通过 Git 仓库部署时，资源 ID 保留在 Cloudflare 控制台，不会回写仓库。

## 设置后端地址

第一次部署结束后，打开刚创建的 Worker：

1. 进入 **Settings** → **Variables and Secrets**。
2. 选择 **Add**。
3. 类型选择普通文本变量。
4. 变量名填写 `CSM_API_BASE`。
5. 值填写自己的 CF-Server-Monitor Worker 地址，例如 `https://your-monitor.example.workers.dev`。
6. 选择 **Deploy** 使变量生效。

如需连接多个后端，用英文逗号分隔：

```text
https://monitor-a.example.workers.dev,https://monitor-b.example.workers.dev
```

还可以在同一位置添加以下可选变量：

- `CSM_SITE_TITLE`：后端未返回 `site_title` 时使用的兜底页面标题；正常情况下主题跟随原站设置。
- `CSM_BACKGROUND_IMAGE`：KV 中还没有主题设置时使用的初始背景图片地址。
- `CSM_REFRESH_INTERVAL`：轮询间隔，单位为毫秒，最小 5000。
- `CSM_CUSTOM_ADMIN_ENABLED`：是否启用实验性主题后台；默认 `false`，管理入口会跳转原站 `/#/admin`。

即使关闭主题后台，首页和详情页仍可在当前主题域名完成登录授权，用于读取非公开站点、隐藏节点和长历史数据。该登录需要下文的跨域配置。

## KV 主题设置

首页齿轮打开主题设置抽屉。设置 JSON 与上传背景分别使用 `theme-settings:v1` 和 `theme-assets/background` 两个 KV key：

- 主题设置公开读取，便于所有访客获得统一外观。
- 保存设置和上传背景必须携带主题域名下保存的上游 JWT。
- Worker 通过上游 `/admin/api` 的无副作用未知 action 验证 JWT，不读取上游敏感设置。
- 图片限制为 2 MB，并验证文件 MIME 与实际文件头；SVG 和任意文件不允许上传。
- 透明化开关、柔和/毛玻璃模式、透明强度和模糊强度均保存在同一份主题设置 JSON 中。
- 自定义 CSS 最大 20,000 字符，禁止外部资源和可执行内容。
- KV 是最终一致存储；当前页面保存后立即应用，其他地区的访问最多可能短暂读到旧值。

这些操作只消耗 CSM-Next 自己的 Worker/KV 请求，不写入 CF-Server-Monitor 的 D1。

`wrangler.jsonc` 已启用 `keep_vars`，因此以后 Git 自动部署不会删除这些控制台变量。

## 允许跨域访问

部署完成后会得到类似下面的地址：

```text
https://csm-next.你的-workers-subdomain.workers.dev
```

回到 CF-Server-Monitor 后端 Worker，把这个来源加入 `CORS_ALLOWED_ORIGINS`，不要带末尾 `/`：

```text
https://csm-next.你的-workers-subdomain.workers.dev
```

如果变量已经存在，用英文逗号追加，不要覆盖原来的来源：

```text
https://原有域名,https://csm-next.你的-workers-subdomain.workers.dev
```

绑定自定义域名后，也要把新域名加入该变量。

## 在本地用 Wrangler 部署

Git 自动部署之外，也可以从本地发布：

```powershell
npm install
npx wrangler login
npm run cf:deploy
```

本地预览 Worker 路由：

```powershell
Copy-Item .\.dev.vars.example .\.dev.vars
npm run cf:dev
```

复制后先把 `.dev.vars` 中的示例地址改成自己的后端地址。该文件已被 Git 忽略。

## 普通静态托管

如果仍要使用 Cloudflare Pages、Nginx 或其他静态托管，先运行：

```powershell
npm run build
```

然后上传 `dist/` 中的文件。普通静态托管使用 `config/config.local.json` 或 `config/config.example.json`，与 Worker 的运行时变量是两套独立配置。

主题抽屉的全站保存与文件上传依赖 `worker/index.js` 和 KV binding；纯静态托管只能继续通过 `config.json` 设置背景，不能使用 KV 持久化。
