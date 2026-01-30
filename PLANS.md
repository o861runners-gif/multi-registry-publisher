# 📋 NPM Multi-Registry Publisher - Kế hoạch dự án

## 🌿 Mục tiêu dự án

✨ Xây dựng một CLI giúp **build + pack + publish** package NodeJS lên **nhiều host/registry khác nhau** theo cùng một chuẩn thao tác  
🎒 Hỗ trợ publish **public / private** và quản trị **auth** theo từng registry  
🧩 Tối ưu cho CI/CD: chạy non-interactive, logs rõ ràng, exit code chuẩn  
🔒 Ưu tiên bảo mật: không in secrets, không ghi token vào log, hỗ trợ secret env

### 🌍 Các đích publish hỗ trợ

- npm registry (npmjs / Verdaccio / Nexus / Artifactory…)
- GitHub Packages (npm registry của GitHub)
- Gitea Packages (cloud hoặc self-host)
- Gitea self-host (tuỳ base URL)
- Publish từ `.tgz` đã có sẵn (local path hoặc remote URL)
- Upload `.tgz` lên Supabase Storage, Pocketbase serve
- Có chức năng mở rộng các host khác khi cần

---

## 🎯 Thiết kế tổng quan

### Đặc điểm chính

- **Một source code**, 1 package.json nhưng có thể upload lên nhiều host
- Các cấu hình đọc từ **process.env** (không bundle dotenv)
- Hỗ trợ cấu hình **{{VAR}}** tự động replace từ environment variables
- Có thể thiết kế public và private riêng, nhiều loại registry

### Cách user inject environment variables

- Export trước: `export NPM_TOKEN=xxx`
- Inline: `NPM_TOKEN=xxx npm-multi-publish publish`
- Dùng dotenv-cli (user tự cài): `dotenv -e .env.dev -- npm-multi-publish publish`
- CI/CD: GitHub Actions secrets, GitLab CI variables, etc.

---

## 🏗️ Kiến trúc dự án

```
npm-multi-publish/
├── src/
│   ├── core/
│   │   ├── builder.js         # Build & pack logic
│   │   ├── publisher.js       # Main publish orchestrator
│   │   └── registry.js        # Registry base class
│   ├── registries/
│   │   ├── npm.js             # NPM registry publisher
│   │   ├── github.js          # GitHub Packages
│   │   ├── gitea.js           # Gitea Packages
│   │   ├── supabase.js        # Supabase Storage
│   │   └── pocketbase.js      # PocketBase Storage
│   ├── config/
│   │   ├── loader.js          # Load & parse config
│   │   ├── validator.js       # Validate config
│   │   └── replacer.js        # {{VAR}} replacement engine
│   ├── auth/
│   │   └── manager.js         # Auth handling per registry
│   └── utils/
│       ├── logger.js          # Logging utility
│       ├── npm-args.js        # NPM args parser & builder
│       └── file.js            # File operations
├── config/
│   ├── .publishrc.example.json
│   └── templates/             # Config templates
├── bin/
│   └── cli.js                 # CLI entry point
├── package.json
└── README.md
```

---

## 📦 Dependencies

```json
{
  "dependencies": {
    "commander": "^11.0.0", // CLI framework
    "chalk": "^4.1.2", // Colored output
    "ora": "^5.4.1", // Spinners
    "node-fetch": "^2.7.0", // HTTP requests (cho storage publishers)
    "form-data": "^4.0.0" // Upload files
  }
}
```

**Lưu ý**: Không dùng `dotenv` - CLI chỉ đọc từ `process.env`

---

## 📝 Các bước thực hiện chi tiết

### **BƯỚC 1: Setup dự án cơ bản**

#### 1.1 Khởi tạo project

```bash
npm init -y
```

#### 1.2 Cấu hình package.json

```json
{
  "name": "npm-multi-publish",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "npm-multi-publish": "./bin/cli.js",
    "nmp": "./bin/cli.js"
  },
  "scripts": {
    "test": "node test/runner.js"
  },
  "engines": {
    "node": ">=14.0.0"
  }
}
```

#### 1.3 Tạo cấu trúc thư mục

```bash
mkdir -p src/{core,registries,config,auth,utils}
mkdir -p config/templates
mkdir -p bin
```

---

### **BƯỚC 2: Hệ thống Config với {{VAR}} Replacement**

#### 2.1 File cấu hình mẫu (.publishrc.json)

```json
{
  "registries": {
    "npmjs-public": {
      "type": "npm",
      "registry": "https://registry.npmjs.org",
      "token": "{{NPM_TOKEN_PUBLIC}}",
      "access": "public",
      "enabled": true
    },

    "npmjs-private": {
      "type": "npm",
      "registry": "{{NPM_PRIVATE_REGISTRY}}",
      "token": "{{NPM_TOKEN_PRIVATE}}",
      "access": "restricted",
      "scope": "@mycompany",
      "enabled": true
    },

    "github": {
      "type": "github",
      "owner": "{{GITHUB_OWNER}}",
      "repo": "{{GITHUB_REPO}}",
      "token": "{{GITHUB_TOKEN}}",
      "enabled": false
    },

    "gitea-selfhost": {
      "type": "gitea",
      "url": "{{GITEA_URL}}",
      "owner": "{{GITEA_OWNER}}",
      "token": "{{GITEA_TOKEN}}",
      "enabled": false
    },

    "supabase-backup": {
      "type": "supabase",
      "url": "{{SUPABASE_URL}}",
      "bucket": "{{SUPABASE_BUCKET}}",
      "serviceKey": "{{SUPABASE_SERVICE_KEY}}",
      "public": true,
      "enabled": false
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

#### 2.2 Config Replacer (src/config/replacer.js)

```javascript
/**
 * Replace {{VAR}} với process.env
 * @param {string} template - String chứa {{VAR}}
 * @param {object} env - Environment variables (default: process.env)
 * @returns {string} - String đã replace
 */
export function replaceEnvVars(template, env = process.env) {
  if (typeof template !== "string") return template;

  return template.replace(/\{\{([A-Z_][A-Z0-9_]*)\}\}/g, (match, varName) => {
    const value = env[varName];

    if (value === undefined) {
      console.warn(`⚠️  Env var ${varName} not set, keeping ${match}`);
      return match;
    }

    return value;
  });
}

/**
 * Deep replace toàn bộ object/array
 * @param {object|array|string} obj - Object cần replace
 * @param {object} env - Environment variables
 * @returns {object|array|string} - Object đã replace
 */
export function replaceEnvVarsDeep(obj, env = process.env) {
  if (typeof obj === "string") {
    return replaceEnvVars(obj, env);
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => replaceEnvVarsDeep(item, env));
  }

  if (obj && typeof obj === "object") {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = replaceEnvVarsDeep(value, env);
    }
    return result;
  }

  return obj;
}

/**
 * Kiểm tra config có còn {{VAR}} chưa replace không
 * @param {object} config - Config object
 * @returns {array} - Danh sách các VAR chưa resolve
 */
export function hasUnresolvedVars(config) {
  const json = JSON.stringify(config);
  const matches = json.match(/\{\{[A-Z_][A-Z0-9_]*\}\}/g);
  return matches || [];
}
```

#### 2.3 Config Loader với Smart Defaults (src/config/loader.js)

```javascript
import fs from "fs";
import path from "path";
import { replaceEnvVarsDeep, hasUnresolvedVars } from "./replacer.js";

/**
 * Load config với full defaults support
 */
export function loadConfig(configPath = ".publishrc.json") {
  let config = {};

  // 1. Load file nếu tồn tại
  if (fs.existsSync(configPath)) {
    const raw = fs.readFileSync(configPath, "utf-8");
    config = JSON.parse(raw);
  } else {
    console.warn(`⚠️  Config file ${configPath} not found, using defaults`);
  }

  // 2. Apply base defaults
  config = applyBaseDefaults(config);

  // 3. Replace {{VAR}} từ process.env
  config = replaceEnvVarsDeep(config, process.env);

  // 4. Validate có VAR nào chưa resolve không
  const unresolved = hasUnresolvedVars(config);
  if (unresolved.length > 0) {
    console.warn(`⚠️  Unresolved variables: ${unresolved.join(", ")}`);
    console.warn("   These registries may fail if enabled");
  }

  return config;
}

/**
 * Apply defaults cho toàn bộ config
 */
function applyBaseDefaults(config) {
  // Build defaults
  if (!config.build) {
    config.build = {};
  }

  if (config.build.command === undefined) {
    config.build.command = detectBuildCommand();
  }

  if (config.build.skipBuild === undefined) {
    config.build.skipBuild = false;
  }

  // NPM defaults
  if (!config.npm) {
    config.npm = {};
  }

  if (!config.npm.defaultArgs) {
    config.npm.defaultArgs = ["--no-git-checks"];
  }

  if (!config.npm.customArgs) {
    config.npm.customArgs = [];
  }

  // Registries defaults
  if (!config.registries) {
    config.registries = {};
  }

  for (const [name, registry] of Object.entries(config.registries)) {
    config.registries[name] = applyRegistryDefaults(registry);
  }

  return config;
}

/**
 * Apply defaults cho từng registry
 */
function applyRegistryDefaults(registry) {
  const defaults = {
    enabled: true,
    access: "public",
  };

  // Type-specific defaults
  if (registry.type === "npm") {
    defaults.registry = defaults.registry || "https://registry.npmjs.org";
  }

  return { ...defaults, ...registry };
}

/**
 * Auto-detect build command từ package.json
 */
function detectBuildCommand() {
  try {
    const pkg = JSON.parse(fs.readFileSync("package.json", "utf-8"));

    if (pkg.scripts?.build) {
      return "npm run build";
    }

    return null; // Không có build script
  } catch (err) {
    console.warn("⚠️  Cannot read package.json");
    return null;
  }
}
```

---

### **BƯỚC 3: NPM Args Handler**

#### 3.1 NPM Args Builder (src/utils/npm-args.js)

```javascript
/**
 * Build npm publish args từ registry config
 * @param {object} registryConfig - Registry configuration
 * @param {object} globalConfig - Global configuration
 * @returns {array} - Array of npm args
 */
export function buildNpmArgs(registryConfig, globalConfig) {
  const args = ["publish"];

  // 1. Default args (từ config hoặc built-in)
  const defaultArgs = globalConfig.npm?.defaultArgs || ["--no-git-checks"];
  args.push(...defaultArgs);

  // 2. Registry-specific
  if (registryConfig.registry) {
    args.push(`--registry=${registryConfig.registry}`);
  }

  if (registryConfig.access) {
    args.push(`--access=${registryConfig.access}`);
  }

  if (registryConfig.tag) {
    args.push(`--tag=${registryConfig.tag}`);
  }

  // 3. Custom args (đã được replace {{VAR}})
  const customArgs = globalConfig.npm?.customArgs || [];
  args.push(...customArgs);

  return args;
}

/**
 * Parse CLI args để lấy pass-through args
 * @param {array} argv - process.argv
 * @returns {array} - Args to pass to npm
 */
export function parseCLIArgs(argv) {
  const doubleDashIndex = argv.indexOf("--");

  if (doubleDashIndex === -1) {
    return [];
  }

  // Tất cả args sau -- sẽ pass cho npm
  return argv.slice(doubleDashIndex + 1);
}
```

---

### **BƯỚC 4: Registry Publishers**

#### 4.1 Base Registry Class (src/core/registry.js)

```javascript
/**
 * Base class cho tất cả registry publishers
 */
export class BaseRegistry {
  constructor(name, config, globalConfig) {
    this.name = name;
    this.config = config;
    this.globalConfig = globalConfig;
  }

  /**
   * Validate registry config
   * @throws {Error} nếu config không hợp lệ
   */
  async validate() {
    throw new Error("validate() must be implemented");
  }

  /**
   * Authenticate với registry
   * @throws {Error} nếu auth fail
   */
  async authenticate() {
    throw new Error("authenticate() must be implemented");
  }

  /**
   * Publish package
   * @param {string} artifactPath - Path to .tgz file
   * @returns {object} - {success: boolean, error?: string}
   */
  async publish(artifactPath) {
    throw new Error("publish() must be implemented");
  }

  /**
   * Cleanup (xóa temp files, .npmrc...)
   */
  async cleanup() {
    // Optional override
  }
}
```

#### 4.2 NPM Registry Publisher (src/registries/npm.js)

```javascript
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { BaseRegistry } from "../core/registry.js";
import { buildNpmArgs } from "../utils/npm-args.js";

export class NpmRegistry extends BaseRegistry {
  constructor(name, config, globalConfig) {
    super(name, config, globalConfig);
    this.npmrcPath = null;
  }

  async validate() {
    // Apply default registry nếu chưa có
    if (!this.config.registry) {
      this.config.registry = this.globalConfig.defaults?.registry || "https://registry.npmjs.org";
    }

    if (!this.config.token) {
      throw new Error(`NPM registry "${this.name}" missing token`);
    }
  }

  async authenticate() {
    // Tạo .npmrc tạm trong temp directory
    const tmpDir = path.join(process.cwd(), ".npm-multi-publish-tmp");
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    this.npmrcPath = path.join(tmpDir, `.npmrc-${this.name}`);

    // Parse registry hostname
    const registryUrl = new URL(this.config.registry);
    const registryHost = `//${registryUrl.host}${registryUrl.pathname}`;

    const npmrcContent = `${registryHost.replace(/\/$/, "")}/:_authToken=${this.config.token}\n`;

    fs.writeFileSync(this.npmrcPath, npmrcContent);
  }

  async publish(artifactPath) {
    const args = buildNpmArgs(this.config, this.globalConfig);

    // Add artifact path
    args.push(artifactPath);

    // Use custom .npmrc
    const env = {
      ...process.env,
      NPM_CONFIG_USERCONFIG: this.npmrcPath,
    };

    const command = `npm ${args.join(" ")}`;

    console.log(`📦 Publishing to ${this.name}...`);
    console.log(`   Registry: ${this.config.registry}`);

    try {
      execSync(command, {
        stdio: "inherit",
        env,
      });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async cleanup() {
    if (this.npmrcPath && fs.existsSync(this.npmrcPath)) {
      fs.unlinkSync(this.npmrcPath);
    }
  }
}
```

#### 4.3 GitHub Packages Publisher (src/registries/github.js)

```javascript
import { NpmRegistry } from "./npm.js";
import { BaseRegistry } from "../core/registry.js";

export class GitHubRegistry extends BaseRegistry {
  async validate() {
    if (!this.config.owner || !this.config.repo) {
      throw new Error("GitHub registry requires owner and repo");
    }
    if (!this.config.token) {
      throw new Error("GitHub registry requires token");
    }
  }

  async authenticate() {
    // GitHub Packages sử dụng npm registry
    this.config.registry = "https://npm.pkg.github.com";
    this.config.scope = `@${this.config.owner}`;
  }

  async publish(artifactPath) {
    // Delegate to NPM publisher với GitHub registry config
    const npmPublisher = new NpmRegistry(
      this.name,
      {
        registry: this.config.registry,
        token: this.config.token,
        access: "restricted", // GitHub Packages luôn là restricted
        scope: this.config.scope,
      },
      this.globalConfig,
    );

    await npmPublisher.authenticate();
    const result = await npmPublisher.publish(artifactPath);
    await npmPublisher.cleanup();

    return result;
  }
}
```

#### 4.4 Gitea Packages Publisher (src/registries/gitea.js)

```javascript
import { NpmRegistry } from "./npm.js";
import { BaseRegistry } from "../core/registry.js";

export class GiteaRegistry extends BaseRegistry {
  async validate() {
    if (!this.config.url) {
      throw new Error("Gitea registry requires url");
    }
    if (!this.config.owner) {
      throw new Error("Gitea registry requires owner");
    }
    if (!this.config.token) {
      throw new Error("Gitea registry requires token");
    }
  }

  async authenticate() {
    // Gitea Packages API format: {url}/api/packages/{owner}/npm
    const baseUrl = this.config.url.replace(/\/$/, "");
    this.config.registry = `${baseUrl}/api/packages/${this.config.owner}/npm`;
    this.config.scope = `@${this.config.owner}`;
  }

  async publish(artifactPath) {
    // Delegate to NPM publisher
    const npmPublisher = new NpmRegistry(
      this.name,
      {
        registry: this.config.registry,
        token: this.config.token,
        access: this.config.access || "public",
        scope: this.config.scope,
      },
      this.globalConfig,
    );

    await npmPublisher.authenticate();
    const result = await npmPublisher.publish(artifactPath);
    await npmPublisher.cleanup();

    return result;
  }
}
```

#### 4.5 Supabase Storage Publisher (src/registries/supabase.js)

```javascript
import fs from "fs";
import fetch from "node-fetch";
import FormData from "form-data";
import { BaseRegistry } from "../core/registry.js";

export class SupabaseRegistry extends BaseRegistry {
  async validate() {
    if (!this.config.url) {
      throw new Error("Supabase registry requires url");
    }
    if (!this.config.bucket) {
      throw new Error("Supabase registry requires bucket");
    }
    if (!this.config.serviceKey) {
      throw new Error("Supabase registry requires serviceKey");
    }
  }

  async authenticate() {
    // Test connection
    const response = await fetch(`${this.config.url}/storage/v1/bucket/${this.config.bucket}`, {
      headers: {
        Authorization: `Bearer ${this.config.serviceKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Supabase auth failed: ${response.statusText}`);
    }
  }

  async publish(artifactPath) {
    const fileName = path.basename(artifactPath);
    const fileStream = fs.createReadStream(artifactPath);

    const form = new FormData();
    form.append("file", fileStream);

    console.log(`📦 Uploading to Supabase Storage...`);
    console.log(`   Bucket: ${this.config.bucket}`);
    console.log(`   File: ${fileName}`);

    try {
      const response = await fetch(`${this.config.url}/storage/v1/object/${this.config.bucket}/${fileName}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.serviceKey}`,
          ...form.getHeaders(),
        },
        body: form,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Upload failed: ${error}`);
      }

      const data = await response.json();

      // Generate public URL if configured
      let publicUrl = null;
      if (this.config.public) {
        publicUrl = `${this.config.url}/storage/v1/object/public/${this.config.bucket}/${fileName}`;
        console.log(`   Public URL: ${publicUrl}`);
      }

      return {
        success: true,
        url: publicUrl,
        key: data.Key,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
```

---

### **BƯỚC 5: Main Publisher Orchestrator**

#### Publisher Core (src/core/publisher.js)

```javascript
import { execSync } from "child_process";
import { NpmRegistry } from "../registries/npm.js";
import { GitHubRegistry } from "../registries/github.js";
import { GiteaRegistry } from "../registries/gitea.js";
import { SupabaseRegistry } from "../registries/supabase.js";
import chalk from "chalk";
import ora from "ora";

const REGISTRY_TYPES = {
  npm: NpmRegistry,
  github: GitHubRegistry,
  gitea: GiteaRegistry,
  supabase: SupabaseRegistry,
  // Add more as needed
};

export class Publisher {
  constructor(config, options = {}) {
    this.config = config;
    this.options = options;
    this.registries = this.initRegistries();
  }

  /**
   * Initialize registries từ config
   */
  initRegistries() {
    const registries = [];

    for (const [name, regConfig] of Object.entries(this.config.registries || {})) {
      // Skip disabled
      if (!regConfig.enabled) {
        console.log(chalk.gray(`○ ${name} (disabled)`));
        continue;
      }

      // Filter by --target
      if (this.options.targets && !this.options.targets.includes(name)) {
        continue;
      }

      const RegistryClass = REGISTRY_TYPES[regConfig.type];
      if (!RegistryClass) {
        console.warn(chalk.yellow(`⚠️  Unknown registry type: ${regConfig.type}`));
        continue;
      }

      registries.push(new RegistryClass(name, regConfig, this.config));
    }

    if (registries.length === 0) {
      throw new Error("No enabled registries found");
    }

    return registries;
  }

  /**
   * Main execution flow
   */
  async run() {
    console.log(chalk.bold("\n🚀 NPM Multi-Registry Publisher\n"));

    // 1. Build (if needed)
    let artifactPath;
    if (!this.options.skipBuild && this.config.build?.command) {
      const spinner = ora("Building package...").start();
      try {
        execSync(this.config.build.command, { stdio: "pipe" });
        spinner.succeed("Build completed");
      } catch (error) {
        spinner.fail("Build failed");
        throw error;
      }
    }

    // 2. Pack
    const spinner = ora("Packing package...").start();
    try {
      const packOutput = execSync("npm pack --json", { encoding: "utf-8" });
      const packInfo = JSON.parse(packOutput)[0];
      artifactPath = packInfo.filename;

      spinner.succeed("Package created");
      console.log(chalk.gray(`   Name: ${packInfo.name}@${packInfo.version}`));
      console.log(chalk.gray(`   Size: ${(packInfo.size / 1024).toFixed(2)} KB`));
      console.log(chalk.gray(`   File: ${artifactPath}`));
    } catch (error) {
      spinner.fail("Pack failed");
      throw error;
    }

    console.log("");

    // 3. Validate all registries
    console.log(chalk.bold("📋 Validating registries...\n"));
    for (const registry of this.registries) {
      try {
        await registry.validate();
        console.log(chalk.green(`✓ ${registry.name}`));
      } catch (error) {
        console.log(chalk.red(`✗ ${registry.name}: ${error.message}`));
        throw error;
      }
    }

    console.log("");

    // 4. Authenticate all
    console.log(chalk.bold("🔑 Authenticating...\n"));
    for (const registry of this.registries) {
      try {
        await registry.authenticate();
        console.log(chalk.green(`✓ ${registry.name}`));
      } catch (error) {
        console.log(chalk.red(`✗ ${registry.name}: ${error.message}`));
        throw error;
      }
    }

    console.log("");

    // 5. Publish to each registry
    console.log(chalk.bold("📦 Publishing...\n"));
    const results = [];

    for (const registry of this.registries) {
      if (this.options.dryRun) {
        console.log(chalk.cyan(`[DRY RUN] ${registry.name}`));
        results.push({
          registry: registry.name,
          success: true,
          dryRun: true,
        });
      } else {
        const result = await registry.publish(artifactPath);
        results.push({
          registry: registry.name,
          ...result,
        });

        if (result.success) {
          console.log(chalk.green(`✓ ${registry.name}`));
        } else {
          console.log(chalk.red(`✗ ${registry.name}: ${result.error}`));
        }
      }
    }

    console.log("");

    // 6. Cleanup
    for (const registry of this.registries) {
      await registry.cleanup();
    }

    // 7. Summary
    this.printSummary(results);

    return results;
  }

  /**
   * Print summary table
   */
  printSummary(results) {
    console.log(chalk.bold("📊 Summary:\n"));

    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success && !r.dryRun);

    for (const result of results) {
      const icon = result.dryRun ? "○" : result.success ? "✅" : "❌";
      const status = result.dryRun ? chalk.cyan("[DRY RUN]") : result.success ? chalk.green("[SUCCESS]") : chalk.red("[FAILED]");
      console.log(`${icon} ${result.registry} ${status}`);

      if (result.url) {
        console.log(chalk.gray(`   URL: ${result.url}`));
      }
    }

    console.log("");
    console.log(chalk.bold(`Total: ${results.length} | Success: ${successful.length} | Failed: ${failed.length}`));
  }
}
```

---

### **BƯỚC 6: CLI Implementation**

#### CLI Entry Point (bin/cli.js)

```javascript
#!/usr/bin/env node

import { Command } from "commander";
import { loadConfig } from "../src/config/loader.js";
import { hasUnresolvedVars } from "../src/config/replacer.js";
import { Publisher } from "../src/core/publisher.js";
import chalk from "chalk";
import fs from "fs";

const program = new Command();

program.name("npm-multi-publish").description("Publish NPM packages to multiple registries").version("1.0.0");

// ============================================================
// Command: publish
// ============================================================
program
  .command("publish")
  .description("Build and publish package to registries")
  .option("-c, --config <path>", "Config file path", ".publishrc.json")
  .option("-t, --target <targets>", "Comma-separated registry names to publish to")
  .option("--dry-run", "Dry run mode (no actual publishing)")
  .option("--skip-build", "Skip build step")
  .allowUnknownOption()
  .action(async (options) => {
    try {
      // 1. Load config (auto replace {{VAR}} from process.env)
      console.log(chalk.gray(`Loading config from ${options.config}...`));
      const config = loadConfig(options.config);

      // 2. Parse targets
      if (options.target) {
        options.targets = options.target.split(",").map((t) => t.trim());
      }

      // 3. Run publisher
      const publisher = new Publisher(config, options);
      const results = await publisher.run();

      // 4. Check results and exit
      const failures = results.filter((r) => !r.success && !r.dryRun);

      if (failures.length > 0) {
        console.error(chalk.red(`\n❌ ${failures.length} registry(ies) failed`));
        process.exit(1);
      }

      console.log(chalk.green("\n✅ All registries published successfully!"));
      process.exit(0);
    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error.message}`));
      if (process.env.DEBUG) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

// ============================================================
// Command: init
// ============================================================
program
  .command("init")
  .description("Create example .publishrc.json config file")
  .action(() => {
    const template = {
      registries: {
        "npmjs-public": {
          type: "npm",
          token: "{{NPM_TOKEN}}",
          access: "public",
          enabled: true,
        },
      },
      build: {
        command: null,
        skipBuild: false,
      },
      npm: {
        defaultArgs: ["--no-git-checks"],
        customArgs: [],
      },
    };

    const configPath = ".publishrc.json";

    if (fs.existsSync(configPath)) {
      console.error(chalk.red("❌ .publishrc.json already exists"));
      process.exit(1);
    }

    fs.writeFileSync(configPath, JSON.stringify(template, null, 2));
    console.log(chalk.green("✅ Created .publishrc.json"));
    console.log("\nNext steps:");
    console.log("1. Edit .publishrc.json and configure your registries");
    console.log("2. Set environment variables (NPM_TOKEN, etc.)");
    console.log("3. Run: npm-multi-publish publish");
  });

// ============================================================
// Command: verify
// ============================================================
program
  .command("verify")
  .description("Verify config and environment variables")
  .option("-c, --config <path>", "Config file path", ".publishrc.json")
  .action((options) => {
    try {
      console.log(chalk.bold("\n🔍 Verifying configuration...\n"));

      const config = loadConfig(options.config);
      const unresolved = hasUnresolvedVars(config);

      // List all registries
      for (const [name, registry] of Object.entries(config.registries || {})) {
        const status = registry.enabled ? chalk.green("✓") : chalk.gray("○");
        const label = registry.enabled ? "enabled" : "disabled";
        console.log(`${status} ${name} (${registry.type}) - ${label}`);

        // Check for unresolved vars in this registry
        const regJson = JSON.stringify(registry);
        const regUnresolved = regJson.match(/\{\{[A-Z_][A-Z0-9_]*\}\}/g) || [];

        if (regUnresolved.length > 0 && registry.enabled) {
          console.log(chalk.yellow(`  ⚠️  Missing env vars: ${regUnresolved.join(", ")}`));
        }
      }

      console.log("");

      if (unresolved.length > 0) {
        console.log(chalk.yellow(`⚠️  Total unresolved variables: ${unresolved.length}`));
        console.log(chalk.yellow("   Set these environment variables before publishing:"));
        unresolved.forEach((v) => console.log(chalk.yellow(`   - ${v.replace(/[{}]/g, "")}`)));
        process.exit(1);
      }

      console.log(chalk.green("✅ Configuration is valid!"));
      console.log(chalk.gray("\nAll environment variables are set correctly."));
      process.exit(0);
    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

// ============================================================
// Command: list
// ============================================================
program
  .command("list")
  .description("List all configured registries")
  .option("-c, --config <path>", "Config file path", ".publishrc.json")
  .action((options) => {
    try {
      const config = loadConfig(options.config);

      console.log(chalk.bold("\n📋 Configured Registries:\n"));

      if (Object.keys(config.registries || {}).length === 0) {
        console.log(chalk.yellow("No registries configured."));
        console.log("Run: npm-multi-publish init");
        return;
      }

      for (const [name, registry] of Object.entries(config.registries)) {
        const icon = registry.enabled ? "✓" : "○";
        const color = registry.enabled ? chalk.green : chalk.gray;
        console.log(color(`${icon} ${name}`));
        console.log(color(`  Type: ${registry.type}`));
        console.log(color(`  Access: ${registry.access || "public"}`));
        if (registry.registry) {
          console.log(color(`  Registry: ${registry.registry}`));
        }
        console.log("");
      }
    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

program.parse();
```

---

## 📚 Usage Examples

### 1. Basic Usage

```bash
# Set environment variables
export NPM_TOKEN=npm_xxxxx
export GITHUB_TOKEN=ghp_yyyyy

# Publish to all enabled registries
npm-multi-publish publish
```

### 2. Inline Environment Variables

```bash
NPM_TOKEN=npm_xxxxx GITHUB_TOKEN=ghp_yyyyy npm-multi-publish publish
```

### 3. With dotenv-cli (user tự cài)

```bash
# Install dotenv-cli globally
npm install -g dotenv-cli

# Use with .env file
dotenv -e .env.dev -- npm-multi-publish publish
dotenv -e .env.prod -- npm-multi-publish publish
```

### 4. Target Specific Registries

```bash
# Only publish to npmjs-public and github
npm-multi-publish publish --target npmjs-public,github
```

### 5. Dry Run

```bash
# Test without actually publishing
npm-multi-publish publish --dry-run
```

### 6. Skip Build Step

```bash
# Skip build, only pack and publish
npm-multi-publish publish --skip-build
```

### 7. Pass Args to NPM

```bash
# Pass additional args to npm publish
npm-multi-publish publish -- --tag=beta --otp=123456
```

### 8. Initialize Config

```bash
# Create .publishrc.json template
npm-multi-publish init

# Verify config
npm-multi-publish verify

# List registries
npm-multi-publish list
```

---

## 🔧 CI/CD Integration

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
      - name: Checkout
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: npm install

      - name: Publish to registries
        env:
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GITEA_TOKEN: ${{ secrets.GITEA_TOKEN }}
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

---

## 🎨 Config Defaults Behavior

### Automatic Defaults

#### 1. Registry Defaults

```javascript
// Nếu không có config, auto-apply:
{
  enabled: true,
  access: "public",
  registry: "https://registry.npmjs.org" // (cho type: npm)
}
```

#### 2. Build Command Auto-detection

```javascript
// Nếu config.build.command = null
// => Auto-detect từ package.json
{
  "scripts": {
    "build": "tsc"  // => sẽ dùng "npm run build"
  }
}
```

#### 3. NPM Args Defaults

```javascript
// Mặc định luôn có:
defaultArgs: ["--no-git-checks"]

// User có thể override:
{
  "npm": {
    "defaultArgs": ["--no-git-checks", "--ignore-scripts"],
    "customArgs": ["--tag=beta"]
  }
}
```

### {{VAR}} Replacement Examples

```json
{
  "registries": {
    "my-registry": {
      "type": "npm",
      "registry": "{{NPM_REGISTRY_URL}}",
      "token": "{{NPM_TOKEN_PROD}}",
      "access": "{{ACCESS_LEVEL}}"
    }
  }
}
```

```bash
# Set env vars
export NPM_REGISTRY_URL=https://npm.mycompany.com
export NPM_TOKEN_PROD=npm_xxxxx
export ACCESS_LEVEL=restricted

# Sau khi load config, sẽ thành:
{
  "registry": "https://npm.mycompany.com",
  "token": "npm_xxxxx",
  "access": "restricted"
}
```

---

## 🔒 Security Best Practices

### 1. Không log sensitive data

```javascript
// ❌ BAD
console.log(`Token: ${config.token}`);

// ✅ GOOD
console.log(`Token: ${"*".repeat(10)}`);
```

### 2. Temp files cleanup

```javascript
// Luôn cleanup .npmrc files
async cleanup() {
  if (this.npmrcPath && fs.existsSync(this.npmrcPath)) {
    fs.unlinkSync(this.npmrcPath);
  }
}
```

### 3. Environment variables

```bash
# ❌ BAD - commit .env vào git
git add .env

# ✅ GOOD - add vào .gitignore
echo ".env*" >> .gitignore
```

---

## 🧪 Testing Strategy

### Unit Tests

```javascript
// test/config/replacer.test.js
import { replaceEnvVars } from "../../src/config/replacer.js";

test("replace single var", () => {
  const result = replaceEnvVars("Token: {{MY_TOKEN}}", { MY_TOKEN: "abc" });
  expect(result).toBe("Token: abc");
});

test("keep unresolved vars", () => {
  const result = replaceEnvVars("Token: {{MISSING}}", {});
  expect(result).toBe("Token: {{MISSING}}");
});
```

### Integration Tests

```javascript
// test/integration/publish.test.js
// Test với Verdaccio local registry
```

---

## 📖 Documentation Structure

### README.md sections:

1. **Installation**
2. **Quick Start**
3. **Configuration**
   - Config file format
   - {{VAR}} replacement
   - Registry types
4. **Usage**
   - CLI commands
   - Examples
5. **CI/CD Integration**
6. **Registry Guides**
   - NPM
   - GitHub Packages
   - Gitea
   - Storage providers
7. **Troubleshooting**
8. **Contributing**

---

## 🚀 Roadmap & Future Features

### Phase 1 (MVP)

- [x] Core config system
- [x] {{VAR}} replacement
- [x] NPM registry publisher
- [x] GitHub Packages publisher
- [x] CLI commands (publish, init, verify)

### Phase 2

- [ ] Gitea publisher
- [ ] Supabase Storage publisher
- [ ] PocketBase publisher
- [ ] Retry logic với exponential backoff
- [ ] Parallel publishing

### Phase 3

- [ ] Plugin system (custom publishers)
- [ ] Version bumping
- [ ] Changelog generation
- [ ] Git tag automation
- [ ] Rollback support

### Phase 4

- [ ] Web UI (optional)
- [ ] Analytics/metrics
- [ ] Notifications (Slack, Discord)

---

## ❓ FAQs

### Q: Tại sao không dùng dotenv?

**A:** Để giảm dependencies và tăng tính linh hoạt. User có thể chọn cách inject env vars phù hợp với workflow của họ (dotenv-cli, direnv, CI/CD secrets, etc.)

### Q: Làm sao để publish một số registry thôi?

**A:** Dùng `--target`: `npm-multi-publish publish --target npm,github`

### Q: Có cần .npmrc trong project không?

**A:** Không. CLI tự tạo .npmrc tạm cho mỗi registry.

### Q: Làm sao debug khi có lỗi?

**A:** Set `DEBUG=1` env var để xem stack trace đầy đủ.

### Q: Có thể dùng với monorepo không?

**A:** Có, chạy trong từng package directory hoặc dùng với Turborepo/Lerna.

---

## 📝 Notes

### Defaults Priority

```
CLI args > Config file > Auto-detected > Built-in defaults
```

### {{VAR}} Replacement Rules

- Chỉ match uppercase letters: `{{NPM_TOKEN}}` ✅
- Case-sensitive: `{{npm_token}}` ❌
- Không replace nếu env var không tồn tại (giữ nguyên `{{VAR}}`)
- Warning hiện lên console nhưng không throw error

### Exit Codes

- `0`: Success
- `1`: Error (config, auth, publish failed)

---

## 📄 License

MIT License - Feel free to use, modify, and distribute.

---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repo
2. Create feature branch
3. Add tests
4. Submit PR

---

**Happy Publishing! 🚀**
