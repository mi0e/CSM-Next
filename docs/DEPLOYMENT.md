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

## 设置后端地址

第一次部署结束后，打开刚创建的 Worker：

1. 进入 **Settings** → **Variables and Secrets**。
2. 选择 **Add**。
3. 类型选择普通文本变量，不要选择 Secret。
4. 变量名填写 `CSM_API_BASE`。
5. 值填写自己的 CF-Server-Monitor Worker 地址，例如 `https://your-monitor.example.workers.dev`。
6. 选择 **Deploy** 使变量生效。

这是 Worker 的运行时变量，不要填在 Workers Builds 的 Build variables 中。后端 URL 最终会发送给浏览器，因此不属于敏感信息，也没有必要设成 Secret。

如需连接多个后端，用英文逗号分隔：

```text
https://monitor-a.example.workers.dev,https://monitor-b.example.workers.dev
```

还可以在同一位置添加以下可选变量：

- `CSM_SITE_TITLE`：页面标题。
- `CSM_BACKGROUND_IMAGE`：背景图片地址，留空表示不使用。
- `CSM_REFRESH_INTERVAL`：轮询间隔，单位为毫秒，最小 5000。

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
