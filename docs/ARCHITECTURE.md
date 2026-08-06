# Architecture

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
