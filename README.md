# CSM-Next

CSM-Next 是为 [CF-Server-Monitor](https://github.com/huilang-me/CF-Server-Monitor) 编写的一套独立前端主题。

UI 仿照 [komari-next](https://github.com/tonyliuzj/komari-next) 制作,数据接口使用 CF-Server-Monitor。主题是**纯静态单页应用**(hash 路由,产物只有 `index.html + assets/`),支持两种部署方式,可同时启用:

1. **上游主题商店**(CF-Server-Monitor ≥ 2.7.13 Beta5):站长在探针后台一键切换,零配置、免 CORS、复用后台登录态。
2. **独立静态托管**:Cloudflare Workers/Pages、GitHub Pages 或任意静态平台,配 `meta apiBase` + 上游 CORS 白名单。

## 界面预览

**首页**(`?preview=1` 模拟数据)

![首页预览](./docs/screenshots/home-preview.png)

## 目前支持

- 首页统计、区域筛选、搜索、网格和表格视图
- CPU、内存、磁盘、网络和流量信息
- 节点详情(hash 路由 `#/server/:id`)与历史负载图表
- 首页最近 1 小时四线路延迟/丢包时间条,详情页 Ping、丢包、波动和悬浮数据
- WebSocket 实时更新,断线后自动重连
- 多个 Worker 数据合并
- 中文、英文、明暗主题和移动端布局
- Cloudflare Turnstile
- 登录授权查看非公开站点、隐藏节点和长历史;主题商店模式下直接复用上游后台登录态
- 首页右侧主题抽屉:背景 URL、独立透明/毛玻璃方案和自定义 CSS
  - 访客层:设置保存在自己浏览器(localStorage),只影响本人
  - 站长层:「复制站点配置」导出片段,粘贴到上游后台「自定义脚本」即成为全站默认外观

## 用主题商店部署(推荐)

打开你的 CF-Server-Monitor 后台(`/admin#admin`)→ **主题商店** → 自定义主题填:

```text
https://github.com/mi0e/CSM-Next/tree/theme-dist
```

预览满意后点应用,完成。站点标题、背景、CSP 白名单等继续在上游后台「外观设置」里管理。详见 [部署说明](./docs/DEPLOYMENT.md)。

## 本地运行

需要 Node.js 18 或更高版本:

```powershell
npm install
npm run dev
```

- 模拟数据:`http://127.0.0.1:4173/?preview=1`
- 真实数据:先复制配置 `Copy-Item .\config\config.example.json .\config\config.local.json`,填入 `apiBase` 后再 `npm run dev`

```json
{
  "apiBase": ["https://your-worker.example.workers.dev"],
  "title": "My Server Monitor",
  "refreshInterval": 60000
}
```

`config.local.json` 不进 Git,构建时其内容被写入 `dist/index.html` 的 `<meta name="apiBase">` 与 `<title>`(上游已废弃 `config.json`,运行时不再请求它)。没有 meta 时前端自动使用同源地址——主题商店模式因此零配置。跨域访问真实数据时,把本地地址与主题域名加入每个 Worker 的 `CORS_ALLOWED_ORIGINS`。

## 独立静态部署(Cloudflare Workers Builds)

1. 把仓库交给 Cloudflare **Workers & Pages** → **Import a repository**。
2. Build command 填 `npm run build`,Deploy command 保持 `npx wrangler deploy`。
3. 保存部署。此后推送 `main` 自动发布。

`wrangler.jsonc` 是纯静态资产配置——没有 Worker 代码、没有 KV。其他平台直接托管 `dist/` 即可。完整步骤与旧版本迁移说明见 [部署说明](./docs/DEPLOYMENT.md)。

## 主题自定义

首页顶部调色盘图标打开右侧「主题自定义」抽屉:

- 填写 HTTPS 背景图片地址(留空则无背景;商店模式下外域图需站长在上游后台 CSP 名单放行)。
- 独立开启界面透明化;可选「柔和透明」(无背景模糊)或「毛玻璃」方案,分别调整透明强度(0%–80%)与毛玻璃强度(0px–30px)。
- 添加最多 20,000 字符的自定义 CSS(禁止 `@import`、`url()`、脚本等外部资源加载)。
- 「保存主题」写入当前浏览器;「恢复默认」回到站点默认;「复制站点配置」导出 `window.__CSM_THEME__` 片段,站长粘贴到上游后台「设置 → 自定义脚本」后全站生效。

## 测试与构建

```powershell
npm test
npm run build
npm run release:theme   # 商店版产物 → theme-dist 分支(本地手动发布用)
```

推送 `main` 后,GitHub Actions(`.github/workflows/theme-dist.yml`)会自动测试、构建并更新 `theme-dist` 分支,通常无需手动发布。

构建结果:

```text
dist/
├─ index.html      # 唯一入口(含两个视图模板)
├─ detail.html     # 旧链接跳转 stub(仅独立部署需要)
└─ assets/
```

## 目录

```text
CSM-Next/
├─ src/                    # 页面、脚本和样式(纯静态)
├─ config/                 # 配置模板与本地配置(仅构建期使用)
├─ tests/                  # node --test 冒烟与单元测试
├─ scripts/                # 构建、本地预览、商店发布
├─ docs/                   # 架构、开发、部署与双方案维护说明
├─ wrangler.jsonc          # Cloudflare 纯静态资产部署配置
└─ package.json
```

需要修改页面时,先看 [开发说明](./docs/DEVELOPMENT.md)、[架构](./docs/ARCHITECTURE.md) 与 [双方案维护指南](./docs/MAINTENANCE.md)(上游商店约定红线在此)。

## 使用说明

- 首页可见节点按需读取最近 1 小时历史聚合为时间条,由 WebSocket 增量更新;延迟和丢包使用 CT/CU/CM/BD 实际上报字段。
- 站点标题跟随原 CF-Server-Monitor 的 `site_title`;页面注入的 `<title>` 仅作兜底。
- 页脚「管理后台」固定打开上游内置后台 `/admin#admin`(上游主题约定,主题不实现管理页)。
- 旗帜与 OS 图标来自上游 Worker 静态资产(`/flags/`、`/os-icons/`),不随主题打包;加载失败显示文字区域码。
- CSM-Next 只保存上游签发的站点隔离 JWT,不保存管理密码或 Secret。

## 相关项目

- 后端:[CF-Server-Monitor](https://github.com/huilang-me/CF-Server-Monitor)
- UI 参考:[komari-next](https://github.com/tonyliuzj/komari-next)
- 界面图标:[Lucide](https://lucide.dev/)(许可见 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md))

CSM-Next 是独立的社区项目,与上述项目维护者没有官方隶属关系。

## License

[MIT](./LICENSE)
