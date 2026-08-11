# SmartGC · AI Engineering Cost

> AI-Driven Engineering Cost Estimation & Management

> 🚀 **[Live Demo](https://gc.qyfanshen.com)** · 📚 **[Docs](docs/)** · 📋 **[Quick Start](docs/QUICKSTART.md)** · 🐛 **[Report Bug](https://github.com/qyfanshen/gc.qyfanshen/issues)** · ⭐ **[Star](https://github.com/qyfanshen/gc.qyfanshen)**

![preview](screenshots/preview.png)
<p align="center">
  <a href="https://github.com/qyfanshen/gc.qyfanshen"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
  <a href="https://github.com/qyfanshen/gc.qyfanshen/actions"><img src="https://img.shields.io/github/actions/workflow/status/qyfanshen/gc.qyfanshen/ci.yml?branch=master&label=CI" alt="CI"></a>
  <a href="https://img.shields.io/github/languages/code-size/qyfanshen/gc.qyfanshen"><img src="https://img.shields.io/github/languages/code-size/qyfanshen/gc.qyfanshen" alt="Code size"></a>
  <a href="https://github.com/qyfanshen/gc.qyfanshen/issues"><img src="https://img.shields.io/github/issues/qyfanshen/gc.qyfanshen" alt="Issues"></a>
  <a href="https://github.com/qyfanshen/gc.qyfanshen"><img src="https://img.shields.io/github/stars/qyfanshen/gc.qyfanshen?style=social" alt="Stars"></a>
</p>

---

**SmartGC** brings AI-assisted estimation, quantity takeoff and project cost control to engineering teams — a login-protected console with bundled templates and assets.

[English](README.md) | [中文](README.zh.md)

## Key Scenarios

- **🏗️ Engineering estimation** — AI-assisted cost estimation and budget management for projects.
- **📐 Quantity takeoff** — Digitize measurement and pricing workflows with fewer manual errors.
- **🔒 Role-based portal** — Login-protected console for project owners and estimation teams.

## Features

### Core Features
- AI-assisted cost estimation workflow demonstration
- Bundled engineering assets: PPTX templates
- SEO-ready: sitemap.xml, robots.txt, semantic markup
- Privacy & legal pages included
- MIT licensed
- Static deploy with Nginx / Apache

### Technical Features
- Modern web stack: HTML5 · CSS3 · Vanilla JavaScript · Nginx/Apache
- Privacy-first: HTTPS enforced, security headers, sensitive-file isolation
- SEO-ready: `sitemap.xml`, `robots.txt`, semantic markup
- License: MIT

## Screenshots

Real screenshots captured after signing in:

### Dashboard (after sign-in)

![Dashboard](screenshots/preview.png)

### AI cost engineering assistant

![AI cost engineering assistant](screenshots/flow-charts.png)

---

## Quick Start

> **Requirements**: Python 3.8+ (use `python` on Windows, `python3` on Linux/macOS)
>
> **Windows note**: if `git clone` fails with `unable to checkout working tree`, run `git config --global core.autocrlf false` first.

Three commands to get started:

```bash
git clone https://gitee.com/qyfanshen/gc.qyfanshen.git
cd gc.qyfanshen.com
python3 -m http.server 8080   # open http://localhost:8080
```

> Full steps (Nginx, env vars, production) in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
## Troubleshooting

- **`git clone` fails with `unable to checkout working tree`**: Windows line-ending issue — run `git config --global core.autocrlf false` and clone again.
- **`python3` is not recognized**: on Windows use `python -m http.server 8080` (or `py -m http.server 8080`).
- **Port 8080 is already in use**: use another port, e.g. `python -m http.server 8000`, then open `http://localhost:8000`.
- **Page returns 404**: make sure you `cd` into the project folder (the one containing `index.html`) before starting the server.
- **Cannot reach localhost**: allow Python through the firewall for local listening, or start with `--bind 0.0.0.0`.

## Demo Account

- **Demo account**: `admin` / `123456` (auto-registers on first login)
- Entry: click the "Enter System" button at the top of the homepage
- After sign-in you can explore the dashboard and AI cost assistant

## Usage Guide

1. Configure your environment (`.env` for PHP, deploy config for static).
3. For static sites: deploy the directory directly to Nginx / CDN.
4. Visit the homepage and verify the landing page renders.
5. (If applicable) login to `/admin/` and review the data.

## Project Structure

```
gc.qyfanshen.com/
├── README.md            # This file (English)
├── README.zh.md         # Chinese README
├── AGENTS.md            # AI agent collaboration notes
├── TODO.md              # Roadmap & TODOs
├── CHANGELOG.md         # Version history
├── CONTRIBUTING.md      # Contribution guide
├── LICENSE              # MIT License
├── index.html           # Entry page
├── privacy.html         # Privacy policy page
├── screenshots/         # Visual assets
│   ├── README.md
│   └── preview.png
├── docs/                # Additional documentation
│   ├── QUICKSTART.md
│   ├── ARCHITECTURE.md
│   ├── DEPLOYMENT.md

└── .github/             # Issue templates & CI workflows
    ├── ISSUE_TEMPLATE/
    ├── workflows/ci.yml
    └── PULL_REQUEST_TEMPLATE.md
```

## Architecture

## 概述

- **项目**：智慧造价 · AI 工程造价智能管理平台
- **类型**：静态落地站（附 CAD 素材）
- **技术栈**：HTML5 · CSS3 · Vanilla JavaScript · Nginx/Apache

## 模块划分









## 数据流

```
[Browser]
   │
   ├─── 静态资源（Nginx / CDN）
   │



   │
   └─── /admin/*（如适用）
```

## 安全设计

- HTTPS 强制（301 跳转）
- 安全响应头：CSP / X-Frame-Options / Referrer-Policy / Permissions-Policy
- 敏感文件（`.env`、`*.bak.*`、`storage/`、`.user.ini`）通过 `.gitignore` + Nginx deny 双重保护
- 接口限流（PHP 站 `api/rate_limit.php`）
- CSRF token 校验（PHP 站 `includes/csrf.php`）

## Development

- Linting / formatting per project conventions
- Run `git status` before committing
- Follow the security guidelines in `.env.example`

## Deployment

## 生产部署

### 1. Nginx 站点配置（推荐）

```nginx
server {
    listen 80;
    server_name gc.qyfanshen.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name gc.qyfanshen.com;

    ssl_certificate     /etc/nginx/ssl/smartgc.crt;
    ssl_certificate_key /etc/nginx/ssl/smartgc.key;

    root /var/www/gc.qyfanshen.com;
    index index.html index.php;

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

    # 静态资源缓存
    location ~* \.(css|js|jpg|jpeg|png|gif|svg|woff2?)$ {
        expires 7d;
        add_header Cache-Control "public, max-age=604800, immutable";
    }

    

    # 禁止访问敏感文件
    location ~ /(\.env|\.user\.ini|\.htaccess|\.bak\.|composer\.json|composer\.lock|package\.json|\.git) {
        deny all;
        return 404;
    }
}
```

### 2. Apache `.htaccess`

```apache
RewriteEngine On
RewriteCond %{HTTPS} !=on
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

<IfModule mod_headers.c>
    Header set X-Frame-Options "SAMEORIGIN"
    Header set X-Content-Type-Options "nosniff"
    Header set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>

<FilesMatch "\.(env|user\.ini|htaccess|bak\.|gitignore)$">
    Require all denied
</FilesMatch>
```

### 4. 部署后检查清单

- [ ] HTTPS 已生效（浏览器锁图标）
- [ ] `https://gc.qyfanshen.com/.env` 返回 404
- [ ] 安全响应头可在 https://securityheaders.com 验证为 A 或 A+
- [ ] sitemap.xml 可访问
- [ ] robots.txt 可访问
- [ ] 隐私页 `privacy.html` 可访问

## Code of Conduct

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) — be kind and respectful.

## Security

Spotted a security issue? 💖 Thank you for disclosing it responsibly!

Before sending the report, please take a moment to skim the [Security Policy](SECURITY.md) — it helps us respond faster and ensures nothing slips through.

## Contributing

Contributions are warmly welcomed! 💖

If you'd like to help out, please read our [CONTRIBUTING.md](CONTRIBUTING.md) and use the [issue templates](.github/ISSUE_TEMPLATE/) along with the [PR template](.github/PULL_REQUEST_TEMPLATE.md) — it makes collaboration much smoother for everyone. 🙏

## License

This project is licensed under the **MIT License**.

**You are free to:**
- ✅ Use commercially
- ✅ Modify
- ✅ Distribute
- ✅ Sublicense
- ✅ Use privately

**Under the following conditions:**
- 📄 Include the original copyright and license notice in any copy of the software

**Full text:** See the [LICENSE](LICENSE) file for the complete license.

## Acknowledgments

- Inspired by [x007xyz/flycut-caption](https://github.com/x007xyz/flycut-caption) repo style
- Built by the Fanshen Group engineering team

## Support

- Issues: please use the in-repo issue templates
- Domain: https://gc.qyfanshen.com

## Contact Us

Scan the QR code below to add our enterprise WeChat for technical support and business inquiries:

![WeChat QR Code](screenshots/wechat-qrcode.png)

Or reach us at:
- Website: <https://qyfanshen.com>
- Issues: please use the in-repo issue templates

---

**Copyright © 2026 [qyfanshen](https://github.com/qyfanshen). All rights reserved.**

Licensed under the [MIT License](LICENSE).
