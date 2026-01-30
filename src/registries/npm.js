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
    let npmrcContent = ``;
    if (this.config.type === "gitea") {
      npmrcContent += `${this.config.scope}:registry=${registryUrl}/` + `\n`;
      npmrcContent += `registry=${registryUrl}/` + `\n`;
      npmrcContent += `always-auth=true` + `\n`;
      npmrcContent += `strict-ssl=true` + `\n`;
    }
    npmrcContent += `${registryHost.replace(/\/$/, "")}/:_authToken=${this.config.token}\n`;

    fs.writeFileSync(this.npmrcPath, npmrcContent, { encoding: "utf8" });
  }

  async publish(artifactPath) {
    const args = buildNpmArgs(this.config, this.globalConfig);
    // Add userconfig flag
    args.push("--userconfig", this.npmrcPath);
    // Add artifact path
    args.push(artifactPath);

    // Parse registry hostname
    const registryUrl = new URL(this.config.registry);
    const registryHost = `//${registryUrl.host}${registryUrl.pathname}`;

    // Use custom .npmrc
    const env = {
      ...process.env,
      NPM_CONFIG_USERCONFIG: this.npmrcPath,
      [`npm_config_${registryHost.replace(/[^a-zA-Z0-9]/g, "_")}_auth_token`]: this.config.authToken,
    };

    const command = `npm ${args.join(" ")}`;

    console.log(`📦 Publishing to ${this.name}...`);
    console.log(`   Registry: ${this.config.registry}`);

    try {
      execSync(command, {
        stdio: "inherit",
        // env,
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
