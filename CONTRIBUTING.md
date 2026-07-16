# Contributing

感谢参与改进。提交改动前请遵循以下流程：

1. 从新分支开始工作，不要提交 `dist/`、ZIP 或 `config/config.local.json`。
2. 页面入口放在 `src/`，样式放在 `src/assets/css/`，逻辑放在 `src/assets/js/`。
3. 不在前端代码中写入 Token、密码或私有 Worker 地址。
4. 运行 `npm test` 和 `npm run build`。
5. UI 改动请在 PR 中附桌面端和移动端截图。

## Commit 规范

采用 [Conventional Commits](https://www.conventionalcommits.org/) 风格。语言不限（中英文均可），但**必须**使用类型前缀。

### 格式

```text
<type>: <summary>

[optional body]
[optional footer]
```

- `type` 小写，后接英文冒号和空格。
- `summary` 用祈使语气写清意图，不超过约 72 字符，句末不加句号。
- 正文可选，解释动机、影响范围或破坏性变更。

### 类型

| 前缀 | 用途 |
| --- | --- |
| `feat:` | 新功能或用户可见能力 |
| `fix:` | 缺陷修复 |
| `docs:` | 仅文档、注释或贡献说明 |
| `refactor:` | 不改变对外行为的代码整理 |
| `style:` | 纯视觉 / 格式调整，无逻辑变化 |
| `test:` | 测试新增或修正 |
| `chore:` | 构建、依赖、配置、杂项维护 |
| `perf:` | 性能优化 |
| `ci:` | CI/CD 流水线 |

### 示例

```text
feat: add multi-site ping legend on detail page

fix: 修复跨域主题无法读取长历史 JWT 的问题

docs: formalize conventional commit message format

refactor: extract history notice outside load/ping panels

chore: bump cache-busting query on detail assets
```

### 注意

- 一次提交只做一类事；功能与无关的文档大改尽量拆开。
- 不要把 `dist/`、密钥、`config.local.json` 打进提交。
- 合并请求标题也沿用同一前缀规则。

## API 兼容性

主题应继续兼容 `CF-Server-Monitor` 的公开接口。新增字段必须提供缺省显示，不能假设所有后端已升级。
