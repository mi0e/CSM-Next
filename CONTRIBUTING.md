# Contributing

感谢参与改进。提交改动前请遵循以下流程：

1. 从新分支开始工作，不要提交 `dist/`、ZIP 或 `config/config.local.json`。
2. 页面入口放在 `src/`，样式放在 `src/assets/css/`，逻辑放在 `src/assets/js/`。
3. 不在前端代码中写入 Token、密码或私有 Worker 地址。
4. 运行 `npm test` 和 `npm run build`。
5. UI 改动请在 PR 中附桌面端和移动端截图。

## Commit 建议

- `feat:` 新功能
- `fix:` 问题修复
- `style:` 纯视觉调整
- `docs:` 文档改动
- `refactor:` 不改变行为的重构
- `test:` 测试改动

## API 兼容性

主题应继续兼容 `CF-Server-Monitor` 的公开接口。新增字段必须提供缺省显示，不能假设所有后端已升级。
