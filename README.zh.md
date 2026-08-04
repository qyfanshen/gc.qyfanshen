# 智慧造价 · AI 工程造价智能管理平台

> AI 驱动的工程造价与项目成本管理

![预览](screenshots/preview.png)

[English](README.md) | [中文](README.zh.md)

## 特色功能

### 核心功能
- AI 辅助造价估算流程演示
- 附带工程素材：DWG/DXF 示例、PPTX 模板
- SEO 就绪：sitemap.xml、robots.txt、语义化标签
- 内置隐私与法律页面
- MIT 协议
- Nginx / Apache 静态部署

### 技术特性
- 现代化技术栈：HTML5 · CSS3 · Vanilla JavaScript · Nginx/Apache · DWG/DXF assets
- 隐私与安全：HTTPS 强制、安全响应头、敏感文件隔离
- SEO 就绪：`sitemap.xml`、`robots.txt`、语义化标签
- 许可证：MIT

## 截图预览

通过本地服务 + 无头浏览器渲染的真实截图：

### 首页预览

![首页预览](screenshots/preview.png)

### 图表分析流程（大视口）

![图表分析流程（大视口）](screenshots/flow-charts.png)

### 移动端响应式（390×844）

![移动端响应式（390×844）](screenshots/mobile-home.png)

---

## 快速开始

### 前置要求
- Git
- Nginx / Apache（或任何静态/PHP 主机）
- 静态站：任何浏览器即可
- PHP 站：PHP 8.0+、MySQL 5.7+ 或 SQLite

### 安装步骤

```bash
# 克隆仓库
git clone https://gitee.com/qyfanshen/gc.qyfanshen.git
cd gc.qyfanshen.com

# （仅 PHP 站点）复制环境变量模板并填入真实值
cp .env.example .env
# 编辑 .env
```

### 本地预览

```bash
# 静态站
python -m http.server 8080

# PHP 站
php -S 127.0.0.1:8080 -t .
```

然后打开 http://localhost:8080

## 使用指南

1. 配置环境（PHP 站填写 `.env`，静态站配置部署参数）
2. PHP 站：导入数据库结构，修改 `config/app.php` 或 `api/db.php`
3. 静态站：直接将目录部署到 Nginx / CDN
4. 访问首页，确认落地页正常渲染
5. （如适用）登录 `/admin/` 检查数据

## 项目结构

```
gc.qyfanshen.com/
├── README.md            # 英文说明
├── README.zh.md         # 本文件（中文说明）
├── AGENTS.md            # AI 协作说明
├── TODO.md              # 路线图与待办
├── CHANGELOG.md         # 版本历史
├── CONTRIBUTING.md      # 贡献指南
├── LICENSE              # MIT 许可证
├── index.html           # 入口页
├── privacy.html         # 隐私政策页
├── screenshots/         # 视觉素材
│   ├── README.md
│   └── preview.png
├── docs/                # 补充文档
│   ├── QUICKSTART.md
│   ├── ARCHITECTURE.md
│   ├── DEPLOYMENT.md

└── .github/             # Issue 模板与 CI 工作流
    ├── ISSUE_TEMPLATE/
    ├── workflows/ci.yml
    └── PULL_REQUEST_TEMPLATE.md
```

## 架构说明

详见 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)。

## 开发指南

- 按项目约定进行 lint / format
- 提交前运行 `git status` 自检
- 遵守 `.env.example` 中的安全约定

## 部署

生产部署步骤详见 [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)，覆盖 Nginx、Apache、Docker、共享主机等方案。

## 贡献

欢迎贡献！请先阅读 [CONTRIBUTING.md](CONTRIBUTING.md)，并使用 [issue 模板](.github/ISSUE_TEMPLATE/) 与 [PR 模板](.github/PULL_REQUEST_TEMPLATE.md)。

## 许可证

[MIT](LICENSE) — 详见 LICENSE 文件。

## 致谢

- 仓库样式参考 [x007xyz/flycut-caption](https://github.com/x007xyz/flycut-caption)
- 由梵燊集团工程团队构建

## 支持

- 问题反馈：请使用仓库内的 issue 模板
- 站点域名：https://gc.qyfanshen.com
