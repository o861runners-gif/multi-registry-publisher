# npm-multi-publish - Updated Version

## 🆕 Các thay đổi mới

Phiên bản này đã được cập nhật để giải quyết các vấn đề sau:

### ✅ Vấn đề đã giải quyết

1. **Publish lên nhiều host với package name khác nhau**
   - Mỗi registry có thể có scope khác nhau
   - Tự động tạo package name phù hợp cho từng registry

2. **Tách riêng source tgz cho từng host**
   - Mỗi registry có file .tgz riêng biệt
   - Tránh xung đột khi publish đồng thời

3. **Tự động tăng version**
   - Format: `1.yy.mmdd.1hhMM`
   - Ví dụ: `1.26.0130.11545` (30 Jan 2026, 15:45)
   - Đảm bảo mỗi lần publish đều có version mới

4. **NPX commands**
   - Hướng dẫn chi tiết cách chạy trực tiếp từ các registry
   - Support cả Windows và Linux

## 📚 Tài liệu

- **[SUMMARY.md](SUMMARY.md)** - Tóm tắt ngắn gọn các thay đổi
- **[CHANGES.md](CHANGES.md)** - Chi tiết đầy đủ về code changes
- **[NPX.md](NPX.md)** - Hướng dẫn sử dụng npx commands

## 🚀 Quick Start

### 1. Config file
```json
{
  "registries": {
    "npmjs": {
      "type": "npm",
      "token": "{{NPM_TOKEN}}",
      "enabled": true
    },
    "codeberg": {
      "type": "gitea",
      "url": "https://codeberg.org",
      "owner": "o861runners",
      "token": "{{CODEBERG_TOKEN}}",
      "enabled": true
    },
    "github": {
      "type": "github",
      "owner": "myusername",
      "repo": "myrepo",
      "token": "{{GITHUB_TOKEN}}",
      "enabled": true
    }
  }
}
```

### 2. Publish
```bash
export NPM_TOKEN=npm_xxxxx
export CODEBERG_TOKEN=xxxxx
export GITHUB_TOKEN=ghp_xxxxx

npm-multi-publish publish
```

### 3. Kết quả

**Original package.json:**
```json
{
  "name": "my-package",
  "version": "1.0.0"
}
```

**Packages được publish:**
- npmjs: `my-package@1.26.0130.11545`
- codeberg: `@o861runners/my-package@1.26.0130.11545`
- github: `@myusername/my-package@1.26.0130.11545`

**Files được tạo:**
```
.npm-multi-publish-tmp/
├── npmjs-my-package-1.26.0130.11545.tgz
├── codeberg-o861runners-my-package-1.26.0130.11545.tgz
└── github-myusername-my-package-1.26.0130.11545.tgz
```

## 📝 Code Changes Overview

### `src/core/publisher.js`

**3 methods mới:**

1. `generateVersion()` - Auto-generate version
2. `createRegistryPackage()` - Tạo package.json riêng cho registry
3. `packForRegistry()` - Pack file .tgz riêng

**Flow mới:**
```
Original package.json
    ↓
For each registry:
    ↓
1. Create registry-specific package.json (with scope + new version)
    ↓
2. Backup original package.json
    ↓
3. Replace with registry-specific package.json
    ↓
4. npm pack → create .tgz
    ↓
5. Rename: registry-name-package-version.tgz
    ↓
6. Restore original package.json
    ↓
7. Publish .tgz to registry
```

## 🔍 Example Commands

### Publish to all registries
```bash
npm-multi-publish publish
```

### Publish to specific registries
```bash
npm-multi-publish publish --target npmjs,codeberg
```

### Test from each registry
```bash
# NPM
npx --yes my-package hello

# Codeberg
npx --yes --registry=https://codeberg.org/api/packages/o861runners/npm/ @o861runners/my-package hello

# GitHub
npx --yes --registry=https://npm.pkg.github.com @myusername/my-package hello
```

## 📊 Version Format

Format: `1.yy.mmdd.1hhMM`

**Ví dụ:**
- 30/01/2026 15:45 → `1.26.0130.11545`
- 15/12/2026 09:30 → `1.26.1215.10930`
- 01/03/2027 23:59 → `1.27.0301.12359`

**Giải thích:**
- `1` - Fixed prefix
- `yy` - 2 chữ số cuối của năm (26 = 2026)
- `mmdd` - Tháng + ngày (0130 = 30 tháng 1)
- `1` - Fixed separator
- `hhMM` - Giờ + phút (1545 = 15:45)

→ Đảm bảo version luôn tăng dần theo thời gian

## 🎯 Benefits

✅ **Tách biệt hoàn toàn:** Mỗi registry có file riêng
✅ **Tự động hóa:** Package name và version tự động đúng
✅ **An toàn:** Luôn backup và restore package.json gốc
✅ **Dễ debug:** Biết chính xác file nào publish đến đâu
✅ **Không xung đột:** Các registry không ảnh hưởng lẫn nhau

## 🔗 Links

- [Full Documentation](CHANGES.md)
- [Quick Summary](SUMMARY.md)
- [NPX Commands Guide](NPX.md)
- [Original PLANS.md](PLANS.md)

---

**Version:** 1.1.0  
**Last Updated:** 2026-01-30
