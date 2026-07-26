# Architecture

## 总体形态

CSM-Next 是**纯静态单页应用**:一个 `index.html` 内嵌两个视图模板(仪表盘、节点详情),`app.js` 按 hash 路由挂载/销毁视图。没有任何服务端代码——同一份产物既可被上游 CF-Server-Monitor 的主题商店代理(同源),也可独立静态托管(跨域 + meta apiBase)。

```text
index.html (#/ 仪表盘, #/server/:id 详情)
  ├─ GET  /api/config                ─┐
  ├─ GET  /api/servers                │ 上游 CF-Server-Monitor
  ├─ GET  /api/server?id=...          │ Worker / D1 / Durable Object
  ├─ GET  /api/history/all?id=...     │
  ├─ WebSocket /api/ws               ─┘
  ├─ IMG  /flags/<code>.svg、/os-icons/*(上游静态资产)
  └─ 主题设置:localStorage + window.__CSM_THEME__(无任何主题侧 API)
```

## 路由

- `app.js` 是唯一入口:解析 `location.hash` → 销毁旧视图 → 从 `<template>` 克隆新视图 DOM → 动态 `import()` 对应模块并调用其 `mount(route)`。
- 同一时刻文档中只存在一个视图的 DOM,两个模板可以安全共用元素 id。
- 每次路由切换视图完全重建(与旧多页架构的跳转行为一致);`mount` 返回 `{ destroy }`,负责关闭 WebSocket、清定时器、移除 document/window 级监听。
- 旧链接 `detail.html?id=x&site=y` 有两层兜底:商店模式下所有路径都返回 index.html,`app.js` 检测 pathname 后 `location.replace` 到 `#/server/x`;独立部署下 `dist/detail.html` 是一个跳转 stub。

## 主题设置的两层模型

`shared/theme.js` 维护两层设置,优先级 **访客 > 站长 > 内置默认**:

1. **站长层**:站长在抽屉里调好样式后点「复制站点配置」,把 `window.__CSM_THEME__ = {...};` 片段粘贴到上游后台「设置 → 自定义脚本」。上游 Worker 会把它注入到每个页面,所有访客把它当作默认外观。独立部署则把同一片段放进托管页面。
2. **访客层**:抽屉「保存主题」写入当前浏览器 `localStorage`(key `csm-next-theme-settings`),只影响本人;「恢复默认」清除本层,回落站长层。

两层数据都经过 `theme-settings.js` 的同一套校验(HTTPS 背景、透明度/模糊范围、自定义 CSS 禁 `@import`/`url()`/脚本),注入层即使被站长写坏也会被 normalize 兜底。

## 与上游的集成约定

- **同源优先**:没有 `<meta name="apiBase">` 时,一切 API 与 WebSocket 走 `location.origin`。商店模式因此零配置,且与上游后台共享 `jwt_token` 登录态(`shared/auth.js` 的 legacy 共存逻辑)。
- **标题回退链**:API `site_title` > 启动时页面上的 `<title>`(商店模式由上游注入、独立模式由构建写入,`injectedSiteTitle()` 首次读取后缓存,避免视图改标题后污染)> 内置默认。
- **管理入口**:固定跳 `<siteBase>/admin#admin`(上游内置前端),主题不实现任何管理页。
- **旗帜/OS 图标**:`shared/flags.js` 从站点 apiBase 源加载 `/flags/<小写码>.svg`,加载失败回退文字区域码;不打包图标文件(上游商店约定)。
- **CSP**:商店模式下上游注入严格 CSP。主题自身零外部依赖(图标内联 SVG、无 CDN、无字体),唯一受影响的是站长配置的外域背景图,需在上游后台 `csp_static` 放行。

## 目录职责

- `src/index.html`:唯一页面入口,两个视图模板 + 主题抽屉 + 登录/验证弹窗。
- `src/detail.html`:旧链接跳转 stub(不进商店发布)。
- `src/assets/js/app.js`:hash 路由器。
- `src/assets/js/dashboard.js` / `detail.js`:两个视图模块,导出 `mount(route)`。
- `src/assets/js/shared/`:跨视图模块(`route` / `theme` / `theme-settings` / `flags` / `auth` / `admin` / `http` / `url` / `title` / `login` / `ping` / `probe-history` / `billing` / `dom` / `i18n`)。
- `src/assets/css/`:`main.css` 公共样式、`detail.css` 详情样式。
- `config/`:`config.example.json` 示例;`config.local.json`(git 忽略)供独立部署构建时注入 meta。
- `scripts/`:`build.mjs` 构建注入、`serve.mjs` 本地预览(含旗帜代理)、`release-theme.mjs` 商店发布。
- `tests/`:`node --test` 冒烟与单元测试,无浏览器依赖。
- `dist/`:构建产物,不提交 Git;`theme-dist` 分支只保存商店产物。

## 权限边界

- 公开页面可读服务器列表、详情与后端允许的历史范围;超过 1 小时历史需 JWT(`Authorization: Bearer`,不读 Cookie)。
- JWT 按 apiBase 域名隔离存 `localStorage`;同源部署时与上游后台共享 legacy `jwt_token`。
- 主题设置纯客户端,不经任何主题侧服务端;站长层片段与上游 `custom_script` 同信任级别(本就由站长控制)。
- 自定义 CSS 通过 `textContent` 写入固定 `<style>`,拒绝外部资源与标签注入。
