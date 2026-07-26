# 双方案维护指南

CSM-Next 只维护**一份纯静态代码**(`src/`),同一份构建产物同时服务两种分发方式。本文说明两种方式如何共存、发布流程、以及跟随上游更新时要检查什么。

## 一份产物,两种分发

```text
src/ ── npm run build ──► dist/ (index.html + assets/ + detail.html 跳转stub)
                            │
        ┌───────────────────┴───────────────────┐
        ▼                                       ▼
 ① 上游主题商店模式                        ② 独立静态部署
 npm run release:theme                     Cloudflare Workers 静态资产 /
 → theme-dist 分支(仅 index.html+assets/)   Pages / GitHub Pages 等
 → 上游后台填 GitHub tree URL               → meta apiBase + 上游 CORS 白名单
```

两种模式跑的是**同一份运行时代码**,行为差异全部由环境自动决定,不需要条件编译:

| 差异点 | ① 商店模式(同源) | ② 独立静态部署(跨域) |
| --- | --- | --- |
| 页面如何到达用户 | 上游 Worker 从 GitHub raw 代理 `index.html` 与 `/assets/*`,缓存 1 小时 | 静态托管平台直接服务 `dist/` |
| API 地址 | 无 meta → 回退 `location.origin`(同源) | 构建时写入 `<meta name="apiBase">`:CI 用构建环境变量 `API_BASE`,本地用 `config.local.json` |
| CORS | 不需要 | 每个上游 Worker 的 `CORS_ALLOWED_ORIGINS` 必须加入主题域名 |
| 站点标题 | 上游 Worker 注入 `<title>`(后台外观设置) | 构建时把 `config.local.json` 的 `title` 写入 `<title>`;运行时仍优先用 API 返回的 `site_title` |
| 站长级主题默认值 | 上游后台「自定义脚本」粘贴抽屉导出的 `window.__CSM_THEME__` 片段,Worker 注入到每个页面 | 同样的片段放进托管页面(或 fork 后写死在 index.html) |
| 背景图/自定义 head | 也可直接用上游后台的 `custom_bg` / `custom_head` | 主题抽屉或 `__CSM_THEME__` |
| CSP | 上游 Worker 强制注入 CSP 响应头(会剥掉主题自己的 CSP meta);外域背景图需站长在上游后台 `csp_static` 放行 | 无注入 CSP,不受限 |
| 旗帜 / OS 图标 | 同源 `/flags/<code>.svg`、`/os-icons/*`(上游静态资产) | 从第一个 apiBase 源加载(`<img>` 跨域不受 CORS 限制);加载失败显示文字区域码 |
| 登录态 | 与上游后台同域,`jwt_token` 自动共享,后台登录过即免登录 | 主题域名独立登录一次,JWT 按 apiBase 隔离存 localStorage |
| 管理入口 | 跳 `/admin#admin`(上游内置前端,主题不得实现管理页) | 跳 `<apiBase>/admin#admin` |

## 上游主题商店的约定红线

改代码前先记住这些约束(出自上游 `theme-develop.md` 与 `src/handlers/frontend.js`),违反任何一条商店模式就会坏:

1. **产物只有 `index.html` + `assets/`**。其他文件在商店模式下不可达(所有非 `/admin`、非 `/assets/*` 路径都返回主题 index.html)。新增静态资源必须放 `assets/` 下。
2. **路由只能用 hash**:首页 `#/`,详情 `#/server/:id`。新页面 = 新 hash 路由 + `<template>`,不要加 `.html` 文件。
3. **不实现管理页**,管理入口只准链接 `/admin#admin`。
4. **不打包旗帜和 OS 图标**,用上游静态文件 `/flags/`、`/os-icons/`。
5. **外部资源默认被 CSP 拦**。上游注入的 `img-src` 白名单只有 self / Turnstile / raw.githubusercontent.com / data: + 站长配置的 `csp_static`。不要引入新的 CDN 依赖;图标继续内联 SVG。
6. **标题、背景、自定义脚本是站长的**,由上游注入,主题不要写死(`injectedSiteTitle()` 已处理标题回退链)。

## 日常开发

```powershell
npm run dev    # 构建 + http://127.0.0.1:4173(?preview=1 模拟数据)
npm test       # node --test,自动发现 tests/*.test.mjs
npm run build  # 产出 dist/
```

- 本地连真实后端:`config/config.example.json` 复制为 `config/config.local.json` 填 `apiBase`(构建时写入 meta,该文件不进 Git)。
- 本地预览的旗帜由 `scripts/serve.mjs` 代理到上游 GitHub raw,失败自动回退文字码,无需本地准备图标。
- 提交前:`npm test` 全绿 + `npm run build` 成功。

## 发布流程

### ① 商店模式发布(theme-dist 分支)

**自动(默认)**:`.github/workflows/theme-dist.yml` 在每次推送 `main` 后自动执行 `npm test` → 纯净构建 → 追加提交并推送 `theme-dist`。产物无变化(如 docs-only 提交)时自动跳过,不产生空发布。

**手动(备选,本地执行)**:

```powershell
npm run release:theme   # 纯净构建(忽略 config.local.json 与环境变量)→ 提交到本地 theme-dist 分支
git push origin theme-dist
```

两种方式产物一致:`theme-dist` 只有 `index.html + assets/`,commit 信息带版本号和源提交。用户在上游后台「主题商店 → 自定义主题」填:

```text
https://github.com/mi0e/CSM-Next/tree/theme-dist
```

想锁版本给用户,可再打 tag 或提交 commit id 形态的 URL(`/tree/<commit>`)。要进官方商店,把同样的产物按 [CFSM-Theme-Store](https://github.com/huilang-me/CFSM-Theme-Store) 的 `themes.json` 结构提交 PR。

注意:上游对 raw 文件有 1 小时缓存,发布后用户端最多延迟 1 小时生效;后台重新「应用主题」可即时刷新。

### ② 独立静态部署发布

推送 `main` 即可——Cloudflare Workers Builds 连接仓库后自动 `npm run build` 并发布 `dist/`(见 `docs/DEPLOYMENT.md`)。其他平台(Pages / GitHub Pages)把 `dist/` 当静态目录发布,并确保页面里有 `<meta name="apiBase">`。

## 跟随上游更新

上游参考副本在工作区 `../CF-Server-Monitor/`(仅本地参考,不随主题发布):

```powershell
cd ../CF-Server-Monitor
git fetch origin
git merge --ff-only origin/main   # fork 落后时先去 GitHub 同步 fork
```

每次同步后核对三处:

1. **`theme-develop.md`**(第三方主题 API 文档):公开 API、WebSocket 消息、静态目录约定是否有变。
2. **`src/handlers/frontend.js`**:主题代理逻辑(路径 fallback、CSP、注入行为)是否有变。
3. **`src/utils/csp.js`**:CSP 白名单变化会直接影响背景图等外部资源能否加载。

对应地跑一遍 `npm test` + 两种模式手动冒烟(商店预览 URL + 本地 dev)。

## 关键文件速查

| 文件 | 职责 |
| --- | --- |
| `src/index.html` | 唯一入口:两个视图 `<template>` + 主题抽屉 + 弹窗 |
| `src/assets/js/app.js` | hash 路由器,视图挂载/销毁,旧链接重定向 |
| `src/assets/js/shared/route.js` | hash 解析/生成(`#/`、`#/server/:id?site=n`) |
| `src/assets/js/shared/theme.js` | 主题设置两层模型:localStorage(访客)+ `window.__CSM_THEME__`(站长)+ 导出片段 |
| `src/assets/js/shared/flags.js` | 旗帜同源加载 + 文字码回退 |
| `src/detail.html` | 旧多页链接跳转 stub(仅独立部署用到,不进 theme-dist) |
| `scripts/build.mjs` | 构建 + meta/title 注入(env `API_BASE`/`TITLE` 优先,再 config.local.json;`THEME_RELEASE=1` 时跳过) |
| `scripts/release-theme.mjs` | 商店版发布到 theme-dist 分支(本地手动 / CI 复用) |
| `.github/workflows/theme-dist.yml` | push main 自动测试并发布 theme-dist |
| `wrangler.jsonc` | Cloudflare 纯静态资产部署(无 Worker 代码) |
