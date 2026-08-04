# TODO

> 项目路线图与待办清单。完成一项后请将 `[ ]` 改为 `[x]`。

## 当前迭代

- [ ] 用真实截图替换 `screenshots/preview.svg` 占位图
- [ ] 校对 README / AGENTS / docs 三份文档与代码实际状态一致
- [ ] CI 流水线跑通（`.github/workflows/ci.yml`）

## 安全 / 合规

- [ ] 复查 `.gitignore` 是否覆盖 `*.bak.*`、`node_modules/`、`.next/`、`.env*`
- [ ] 复查 Nginx / Apache 配置文件中的安全头（CSP / X-Frame-Options / Referrer-Policy）
- [ ] 私钥、数据库连接串不出现在任何提交文件中

## 后续迭代

- [ ] 增加多语言（英文 / 繁体）支持
- [ ] 接入 Lighthouse / PageSpeed 自动监测
- [ ] 增加 LICENSE 之外的 NOTICE / 第三方依赖声明
