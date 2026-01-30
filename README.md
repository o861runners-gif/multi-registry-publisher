# 🚀 NPM Multi-Registry Publisher

CLI tool để **build + pack + publish** package NodeJS lên **nhiều host/registry khác nhau** theo cùng một chuẩn thao tác.

## ✨ Tính năng

- 📦 Publish lên nhiều registry cùng lúc
- 🔑 Quản lý auth riêng cho từng registry
- 🌍 Hỗ trợ: NPM, GitHub Packages, Gitea, Supabase, PocketBase
- 🔒 Bảo mật: Không log secrets, tự động cleanup temp files
- 🎯 CI/CD friendly: Non-interactive, exit codes chuẩn
- 🧩 Config linh hoạt với `{{VAR}}` replacement từ environment

## 📦 Cài đặt

```bash
npm install -g npm-multi-publish
```

Hoặc dùng trực tiếp với npx:

```bash
npx npm-multi-publish publish
```

## 🚀 Quick Start

### 1. Tạo file config

```bash
npm-multi-publish init
```

Sẽ tạo file `.publishrc.json`:

```json
{
  "registries": {
    "npmjs-public": {
      "type": "npm",
      "token": "{{NPM_TOKEN}}",
      "access": "public",
      "enabled": true
    }
  },
  "build": {
    "command": null,
    "skipBuild": false
  },
  "npm": {
    "defaultArgs": ["--no-git-checks"],
    "customArgs": []
  }
}
```

### 2. Set environment variables

```bash
export NPM_TOKEN=npm_xxxxxxxxxxxxx
```

### 3. Publish

```bash
npm-multi-publish publish
```

## 📖 Cấu hình

### Registry Types

#### NPM Registry

```json
{
  "my-npm-registry": {
    "type": "npm",
    "registry": "https://registry.npmjs.org",
    "token": "{{NPM_TOKEN}}",
    "access": "public",
    "tag": "latest",
    "enabled": true
  }
}
```

#### GitHub Packages

```json
{
  "github": {
    "type": "github",
    "owner": "{{GITHUB_OWNER}}",
    "repo": "{{GITHUB_REPO}}",
    "token": "{{GITHUB_TOKEN}}",
    "enabled": true
  }
}
```

#### Gitea Packages

```json
{
  "gitea": {
    "type": "gitea",
    "url": "https://gitea.example.com",
    "owner": "myorg",
    "token": "{{GITEA_TOKEN}}",
    "access": "public",
    "enabled": true
  }
}
```

```npx
 npx --yes --registry https://codeberg.org/api/packages/o861runners/npm/ @o861runners-gif/simplepkg2 thử
```

#### Supabase Storage

```json
{
  "supabase": {
    "type": "supabase",
    "url": "{{SUPABASE_URL}}",
    "bucket": "packages",
    "serviceKey": "{{SUPABASE_SERVICE_KEY}}",
    "public": true,
    "enabled": true
  }
}
```

#### PocketBase Storage

```json
{
  "pocketbase": {
    "type": "pocketbase",
    "url": "{{POCKETBASE_URL}}",
    "collection": "packages",
    "email": "{{POCKETBASE_EMAIL}}",
    "password": "{{POCKETBASE_PASSWORD}}",
    "enabled": true
  }
}
```

### Build Configuration

```json
{
  "build": {
    "command": "npm run build", // null để auto-detect
    "skipBuild": false
  }
}
```

### NPM Arguments

```json
{
  "npm": {
    "defaultArgs": ["--no-git-checks"],
    "customArgs": ["--tag=beta"]
  }
}
```

## 🎯 Usage Examples

### Basic Usage

```bash
# Set env vars
export NPM_TOKEN=npm_xxxxx
export GITHUB_TOKEN=ghp_yyyyy

# Publish to all enabled registries
npm-multi-publish publish
```

### Inline Environment Variables

```bash
NPM_TOKEN=npm_xxxxx GITHUB_TOKEN=ghp_yyyyy npm-multi-publish publish
```

### With dotenv-cli

```bash
# Install dotenv-cli
npm install -g dotenv-cli

# Use with .env file
dotenv -e .env.dev -- npm-multi-publish publish
```

### Target Specific Registries

```bash
# Only publish to npmjs-public and github
npm-multi-publish publish --target npmjs-public,github
```

### Dry Run

```bash
# Test without actually publishing
npm-multi-publish publish --dry-run
```

### Skip Build

```bash
npm-multi-publish publish --skip-build
```

### Pass Additional NPM Args

```bash
npm-multi-publish publish -- --tag=beta --otp=123456
```

## 🔧 CLI Commands

### `publish`

Build and publish package to registries.

```bash
npm-multi-publish publish [options]

Options:
  -c, --config <path>     Config file path (default: .publishrc.json)
  -t, --target <targets>  Comma-separated registry names
  --dry-run               Dry run mode
  --skip-build            Skip build step
```

### `init`

Create example config file.

```bash
npm-multi-publish init
```

### `verify`

Verify configuration and environment variables.

```bash
npm-multi-publish verify
```

### `list`

List all configured registries.

```bash
npm-multi-publish list
```

## 🤖 CI/CD Integration

### GitHub Actions

```yaml
name: Publish Package

on:
  push:
    tags:
      - "v*"

jobs:
  publish:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - run: npm install

      - name: Publish
        env:
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: npx npm-multi-publish publish
```

### GitLab CI

```yaml
publish:
  stage: deploy
  only:
    - tags
  script:
    - npm install
    - npx npm-multi-publish publish
  variables:
    NPM_TOKEN: $NPM_TOKEN
    GITHUB_TOKEN: $GITHUB_TOKEN
```

## 🔒 Security Best Practices

1. **Never commit secrets**

   ```bash
   echo ".env*" >> .gitignore
   ```

2. **Use environment variables**
   - GitHub Actions: Use secrets
   - GitLab CI: Use CI/CD variables
   - Local: Use `.env` with dotenv-cli

3. **Validate before publishing**
   ```bash
   npm-multi-publish verify
   ```

## 🧪 {{VAR}} Replacement

Config tự động replace `{{VAR}}` từ `process.env`:

```json
{
  "registry": "{{NPM_REGISTRY_URL}}",
  "token": "{{NPM_TOKEN}}"
}
```

```bash
export NPM_REGISTRY_URL=https://npm.company.com
export NPM_TOKEN=npm_xxxxx

# Sau khi load, sẽ thành:
{
  "registry": "https://npm.company.com",
  "token": "npm_xxxxx"
}
```

### Rules

- Chỉ match uppercase: `{{NPM_TOKEN}}` ✅
- Case-sensitive: `{{npm_token}}` ❌
- Giữ nguyên nếu không tồn tại: `{{MISSING}}` → `{{MISSING}}`
- Warning hiện lên console

## 🐛 Troubleshooting

### Config not found

```bash
npm-multi-publish init
```

### Unresolved variables

```bash
npm-multi-publish verify
# Xem env vars nào còn thiếu
```

### Debug mode

```bash
DEBUG=1 npm-multi-publish publish
```

### Registry authentication failed

Check token và permissions:

- NPM: Verify token với `npm whoami`
- GitHub: Token cần `write:packages` scope
- Gitea: Token cần write access

## 📚 Examples

Xem thêm ví dụ trong thư mục `examples/`:

- `examples/basic/` - Basic NPM publish
- `examples/multi-registry/` - Publish to multiple registries
- `examples/monorepo/` - Monorepo setup
- `examples/ci-cd/` - CI/CD workflows

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repo
2. Create feature branch
3. Add tests
4. Submit PR

## 📄 License

MIT License - Feel free to use, modify, and distribute.

## ❓ FAQ

### Q: Tại sao không bundle dotenv?

**A:** Để giảm dependencies và tăng tính linh hoạt. User có thể chọn cách inject env vars phù hợp với workflow của họ.

### Q: Làm sao publish một số registry thôi?

**A:** Dùng `--target`: `npm-multi-publish publish --target npm,github`

### Q: Có cần .npmrc trong project không?

**A:** Không. CLI tự tạo .npmrc tạm cho mỗi registry.

### Q: Có thể dùng với monorepo không?

**A:** Có, chạy trong từng package directory hoặc dùng với Turborepo/Lerna.

---

**Happy Publishing! 🚀**
