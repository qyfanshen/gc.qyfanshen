# SmartGC · AI Engineering Cost

> AI-Driven Engineering Cost Estimation & Management

![preview](screenshots/preview.png)

[English](README.md) | [中文](README.zh.md)

## Features

### Core Features
- AI-assisted cost estimation workflow demonstration
- Bundled engineering assets: DWG/DXF samples, PPTX templates
- SEO-ready: sitemap.xml, robots.txt, semantic markup
- Privacy & legal pages included
- MIT licensed
- Static deploy with Nginx / Apache

### Technical Features
- Modern web stack: HTML5 · CSS3 · Vanilla JavaScript · Nginx/Apache · DWG/DXF assets
- Privacy-first: HTTPS enforced, security headers, sensitive-file isolation
- SEO-ready: `sitemap.xml`, `robots.txt`, semantic markup
- License: MIT

## Screenshots

Real screenshots captured via local server + headless Edge:

### Home page preview

![Home page preview](screenshots/preview.png)

### Charts flow (extended viewport)

![Charts flow (extended viewport)](screenshots/flow-charts.png)

---

## Quick Start

### Prerequisites
- Git
- Nginx / Apache (or any static/PHP host)
- For the static sites: any browser
- For the PHP sites: PHP 8.0+, MySQL 5.7+ or SQLite

### Installation

```bash
# Clone the repository
git clone https://gitee.com/qyfanshen/gc.qyfanshen.git
cd gc.qyfanshen.com

# (PHP sites only) copy the env template and fill in your values
cp .env.example .env
# edit .env
```

### Local Preview

```bash
# Static site
python -m http.server 8080

# PHP site
php -S 127.0.0.1:8080 -t .
```

Then open http://localhost:8080

## Usage Guide

1. Configure your environment (`.env` for PHP, deploy config for static).
2. For PHP sites: import the database schema and update `config/app.php` (or `api/db.php`).
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
- **技术栈**：HTML5 · CSS3 · Vanilla JavaScript · Nginx/Apache · DWG/DXF assets

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

### 3. Docker（仅 Next.js）

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package*.json ./
RUN npm ci --omit=dev
EXPOSE 3000
CMD ["npm", "start"]
```

### 4. 部署后检查清单

- [ ] HTTPS 已生效（浏览器锁图标）
- [ ] `https://https://gc.qyfanshen.com/.env` 返回 404
- [ ] 安全响应头可在 https://securityheaders.com 验证为 A 或 A+
- [ ] sitemap.xml 可访问
- [ ] robots.txt 可访问
- [ ] 隐私页 `privacy.html` 可访问

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) first. Use the [issue templates](.github/ISSUE_TEMPLATE/) and the [PR template](.github/PULL_REQUEST_TEMPLATE.md).

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
