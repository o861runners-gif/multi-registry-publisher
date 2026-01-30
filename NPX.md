# NPX Commands - Chạy trực tiếp các package từ các registry khác nhau

## 📝 Lưu ý quan trọng

- Các lệnh dưới đây chạy trực tiếp package từ registry mà không cần cài đặt
- Mỗi lệnh độc lập, không xung đột với nhau
- Thích hợp cho việc test và sử dụng nhanh

---

## 🌐 NPM Registry (npmjs.org)

### Chạy public package

```bash
npx @o861runners-gif/simplepkg2 hello world
```

```cmd
npx --yes @ohau26-1221/simplepkg2 hello world
```

### Chạy với version cụ thể

```bash
npx @o861runners-gif/simplepkg2@1.0.3 test
```

### Chạy với flag --yes để tự động confirm

```bash
npx --yes @o861runners-gif/simplepkg2 argument1 argument2
```

---

## 🐙 GitHub Packages

### Chạy package từ GitHub

```bash
npx --registry=https://npm.pkg.github.com @GITHUB_USERNAME/PACKAGE_NAME argument1
```

### Ví dụ cụ thể

```bash
npx --registry=https://npm.pkg.github.com @myusername/mypackage hello
```

### Chạy với authentication (nếu cần)

```bash
npm config set @GITHUB_USERNAME:registry https://npm.pkg.github.com
npm config set //npm.pkg.github.com/:_authToken YOUR_GITHUB_TOKEN
npx @GITHUB_USERNAME/PACKAGE_NAME argument1
```

---

## 🦎 Gitea / Codeberg

### Chạy package từ Codeberg

```bash
npx --yes --registry=https://codeberg.org/api/packages/o861runners/npm/ @o861runners-gif/simplepkg2 thử
```

```cmd
npx --yes --registry=https://codeberg.org/api/packages/ohau261221/npm/ @ohau261221/simplepkg2 thử
```

### Chạy từ Gitea self-hosted

```bash
npx --yes --registry=https://gitea.example.com/api/packages/USERNAME/npm/ @USERNAME/PACKAGE_NAME arg1 arg2
```

### Template command cho Gitea

```bash
npx --yes --registry=https://GITEA_URL/api/packages/OWNER/npm/ @OWNER/PACKAGE_NAME [arguments]
```

---

## 📦 Các lệnh hữu ích

### Xem thông tin package trước khi chạy

```bash
npm view @o861runners-gif/simplepkg2 --registry=https://codeberg.org/api/packages/o861runners/npm/
```

### Liệt kê tất cả version

```bash
npm view @o861runners-gif/simplepkg2 versions --registry=https://codeberg.org/api/packages/o861runners/npm/
```

### Xem package.json

```bash
npm view @o861runners-gif/simplepkg2 --json --registry=https://codeberg.org/api/packages/o861runners/npm/
```

---

## 🔧 Troubleshooting

### Lỗi 404 Not Found

Kiểm tra:

- Package name đúng chưa?
- Scope (@username) có khớp với owner không?
- Registry URL đúng format chưa?

### Lỗi 401 Unauthorized

Đối với private packages:

```bash
npm config set //REGISTRY_HOST/:_authToken YOUR_TOKEN
```

### Clear npm cache

```bash
npm cache clean --force
```

---

## 💡 Tips

### 1. Sử dụng alias trong terminal

**Windows (PowerShell):**

```powershell
function Run-Codeberg { npx --yes --registry=https://codeberg.org/api/packages/o861runners/npm/ @o861runners-gif/simplepkg2 $args }
Set-Alias runcb Run-Codeberg
```

Sau đó chạy:

```powershell
runcb hello world
```

**Linux/Mac (Bash/Zsh):**

```bash
alias runcb='npx --yes --registry=https://codeberg.org/api/packages/o861runners/npm/ @o861runners-gif/simplepkg2'
```

Sau đó chạy:

```bash
runcb hello world
```

### 2. Script để test nhiều registry

**Windows (test-all.bat):**

```batch
@echo off
echo Testing NPM Registry...
npx --yes @o861runners-gif/simplepkg2 test-npm

echo Testing Codeberg...
npx --yes --registry=https://codeberg.org/api/packages/o861runners/npm/ @o861runners-gif/simplepkg2 test-codeberg

echo Testing GitHub...
npx --yes --registry=https://npm.pkg.github.com @myusername/mypackage test-github
```

**Linux/Mac (test-all.sh):**

```bash
#!/bin/bash

echo "Testing NPM Registry..."
npx --yes @o861runners-gif/simplepkg2 test-npm

echo "Testing Codeberg..."
npx --yes --registry=https://codeberg.org/api/packages/o861runners/npm/ @o861runners-gif/simplepkg2 test-codeberg

echo "Testing GitHub..."
npx --yes --registry=https://npm.pkg.github.com @myusername/mypackage test-github
```

### 3. Sử dụng .npmrc cho project cụ thể

Tạo file `.npmrc` trong project:

```
@o861runners-gif:registry=https://codeberg.org/api/packages/o861runners/npm/
@myusername:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

Sau đó chỉ cần:

```bash
npx @o861runners-gif/simplepkg2 arguments
```

---

## 📋 Các lệnh một dòng (One-liner commands)

### NPM Registry

```bash
npx --yes @o861runners-gif/simplepkg2 hello
```

### Codeberg

```bash
npx --yes --registry=https://codeberg.org/api/packages/o861runners/npm/ @o861runners-gif/simplepkg2 hello
```

### GitHub Packages

```bash
npx --yes --registry=https://npm.pkg.github.com @username/package hello
npx --yes --registry=https://npm.pkg.github.com @username/package hello
npx --yes --registry=https://npm.pkg.github.com @o861runners-gif/simplepkg2 hello
```

### Gitea Custom

```bash
npx --yes --registry=https://git.domain.com/api/packages/owner/npm/ @owner/package hello
```

### Verdaccio (Local)

```bash
npx --yes --registry=http://localhost:4873 @scope/package hello
```

---

## 🚀 Quick Reference Table

| Registry      | Command Template                                                              |
| ------------- | ----------------------------------------------------------------------------- |
| **npmjs.org** | `npx @scope/package args`                                                     |
| **Codeberg**  | `npx --registry=https://codeberg.org/api/packages/OWNER/npm/ @OWNER/PKG args` |
| **GitHub**    | `npx --registry=https://npm.pkg.github.com @USER/PKG args`                    |
| **Gitea**     | `npx --registry=https://GITEA_URL/api/packages/OWNER/npm/ @OWNER/PKG args`    |
| **Verdaccio** | `npx --registry=http://localhost:4873 @scope/PKG args`                        |

---

## ⚙️ Environment Variables

Để tránh phải nhập token mỗi lần:

**Windows:**

```cmd
set NPM_TOKEN=your_token_here
set GITHUB_TOKEN=your_github_token
```

**Linux/Mac:**

```bash
export NPM_TOKEN=your_token_here
export GITHUB_TOKEN=your_github_token
```

**Permanent (add to .bashrc/.zshrc):**

```bash
echo 'export NPM_TOKEN=your_token_here' >> ~/.bashrc
echo 'export GITHUB_TOKEN=your_github_token' >> ~/.bashrc
source ~/.bashrc
```

---

## 📌 Examples với các scenario thực tế

### Scenario 1: Test package ngay sau khi publish

```bash
# Publish lên Codeberg
npm-multi-publish publish --target codeberg

# Test ngay
npx --yes --registry=https://codeberg.org/api/packages/o861runners/npm/ @o861runners-gif/simplepkg2 test
```

### Scenario 2: So sánh output từ các registry

```bash
echo "NPM:" && npx --yes @pkg/name test
echo "Codeberg:" && npx --yes --registry=https://codeberg.org/api/packages/owner/npm/ @owner/name test
echo "GitHub:" && npx --yes --registry=https://npm.pkg.github.com @user/name test
```

### Scenario 3: CI/CD testing

```yaml
# GitHub Actions
- name: Test from NPM
  run: npx --yes @scope/package --version

- name: Test from Codeberg
  run: npx --yes --registry=https://codeberg.org/api/packages/owner/npm/ @owner/package --version

- name: Test from GitHub Packages
  run: npx --yes --registry=https://npm.pkg.github.com @user/package --version
  env:
    NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

**Cập nhật cuối:** 2026-01-30
