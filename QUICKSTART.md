# 🚀 Quick Start Guide

Hướng dẫn nhanh để bắt đầu với **npm-multi-publish**.

## 📦 Cài đặt

### Cách 1: Cài đặt global

```bash
npm install -g npm-multi-publish
```

### Cách 2: Sử dụng trực tiếp với npx

```bash
npx npm-multi-publish publish
```

### Cách 3: Cài đặt local trong project

```bash
npm install --save-dev npm-multi-publish
```

Thêm vào `package.json`:
```json
{
  "scripts": {
    "publish-all": "npm-multi-publish publish"
  }
}
```

## ⚡ Sử dụng cơ bản

### 1. Tạo file cấu hình

```bash
npm-multi-publish init
```

File `.publishrc.json` sẽ được tạo:

```json
{
  "registries": {
    "npmjs-public": {
      "type": "npm",
      "token": "{{NPM_TOKEN}}",
      "access": "public",
      "enabled": true
    }
  }
}
```

### 2. Thiết lập environment variables

**Cách 1: Export trực tiếp**
```bash
export NPM_TOKEN=npm_xxxxxxxxxxxxxxxxxx
```

**Cách 2: Tạo file .env**
```bash
# Tạo file .env
NPM_TOKEN=npm_xxxxxxxxxxxxxxxxxx
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxx
```

```bash
# Sử dụng với dotenv-cli
npm install -g dotenv-cli
dotenv -- npm-multi-publish publish
```

**Cách 3: Inline**
```bash
NPM_TOKEN=npm_xxx npm-multi-publish publish
```

### 3. Publish

```bash
npm-multi-publish publish
```

## 🎯 Các tình huống thường gặp

### Publish lên NPM public

```json
{
  "registries": {
    "npmjs": {
      "type": "npm",
      "token": "{{NPM_TOKEN}}",
      "access": "public",
      "enabled": true
    }
  }
}
```

```bash
export NPM_TOKEN=npm_xxxxxxxxxx
npm-multi-publish publish
```

### Publish lên cả NPM và GitHub Packages

```json
{
  "registries": {
    "npmjs": {
      "type": "npm",
      "token": "{{NPM_TOKEN}}",
      "access": "public",
      "enabled": true
    },
    "github": {
      "type": "github",
      "owner": "{{GITHUB_OWNER}}",
      "repo": "{{GITHUB_REPO}}",
      "token": "{{GITHUB_TOKEN}}",
      "enabled": true
    }
  }
}
```

```bash
export NPM_TOKEN=npm_xxxxxxxxxx
export GITHUB_OWNER=myusername
export GITHUB_REPO=mypackage
export GITHUB_TOKEN=ghp_xxxxxxxxxx

npm-multi-publish publish
```

### Publish với private registry

```json
{
  "registries": {
    "company-npm": {
      "type": "npm",
      "registry": "https://npm.company.com",
      "token": "{{COMPANY_NPM_TOKEN}}",
      "access": "restricted",
      "scope": "@company",
      "enabled": true
    }
  }
}
```

### Backup lên Supabase Storage

```json
{
  "registries": {
    "npmjs": {
      "type": "npm",
      "token": "{{NPM_TOKEN}}",
      "enabled": true
    },
    "supabase-backup": {
      "type": "supabase",
      "url": "{{SUPABASE_URL}}",
      "bucket": "npm-packages",
      "serviceKey": "{{SUPABASE_SERVICE_KEY}}",
      "public": true,
      "enabled": true
    }
  }
}
```

## 🔧 Commands hữu ích

### Xem danh sách registries

```bash
npm-multi-publish list
```

### Kiểm tra cấu hình

```bash
npm-multi-publish verify
```

### Dry run (test không publish thật)

```bash
npm-multi-publish publish --dry-run
```

### Publish chỉ một số registry

```bash
npm-multi-publish publish --target npmjs,github
```

### Skip build step

```bash
npm-multi-publish publish --skip-build
```

### Truyền thêm args cho npm

```bash
npm-multi-publish publish -- --tag=beta --otp=123456
```

## 🤖 Sử dụng trong CI/CD

### GitHub Actions

Tạo file `.github/workflows/publish.yml`:

```yaml
name: Publish

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npx npm-multi-publish publish
        env:
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Thêm secrets trong GitHub:
- Settings → Secrets → New repository secret
- Tạo `NPM_TOKEN` với giá trị token của bạn

### GitLab CI

Tạo file `.gitlab-ci.yml`:

```yaml
publish:
  stage: deploy
  only:
    - tags
  script:
    - npm ci
    - npx npm-multi-publish publish
  variables:
    NPM_TOKEN: $NPM_TOKEN
```

Thêm variables trong GitLab:
- Settings → CI/CD → Variables
- Tạo `NPM_TOKEN` (Protected, Masked)

## ❓ Troubleshooting

### "Config file not found"

```bash
npm-multi-publish init
```

### "Unresolved variables: {{NPM_TOKEN}}"

Bạn chưa set environment variable. Set bằng:
```bash
export NPM_TOKEN=npm_xxxxx
```

### "Authentication failed"

Kiểm tra token:
- NPM: `npm whoami --registry=https://registry.npmjs.org`
- GitHub: Token cần scope `write:packages`

### "Build failed"

Skip build step:
```bash
npm-multi-publish publish --skip-build
```

Hoặc set `skipBuild: true` trong config:
```json
{
  "build": {
    "skipBuild": true
  }
}
```

## 📚 Đọc thêm

- [README.md](README.md) - Tài liệu đầy đủ
- [CONTRIBUTING.md](CONTRIBUTING.md) - Hướng dẫn đóng góp
- [Config Examples](config/templates/) - Các mẫu config

---

**Happy Publishing! 🎉**
