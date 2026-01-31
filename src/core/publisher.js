import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { NpmRegistry } from "../registries/npm.js";
import { GitHubRegistry } from "../registries/github.js";
import { GiteaRegistry } from "../registries/gitea.js";
import { SupabaseRegistry } from "../registries/supabase.js";
import { PocketBaseRegistry } from "../registries/pocketbase.js";
import chalk from "chalk";
import ora from "ora";

const REGISTRY_TYPES = {
  npm: NpmRegistry,
  github: GitHubRegistry,
  gitea: GiteaRegistry,
  supabase: SupabaseRegistry,
  pocketbase: PocketBaseRegistry,
};

export class Publisher {
  constructor(config, options = {}) {
    this.config = config;
    this.options = options;
    this.registries = this.initRegistries();
    this.tmpDir = path.join(process.cwd(), ".npm-multi-publish-tmp");
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
   * Generate version: 1.yy.mmdd.1hhMM
   * @returns {string} Version string
   *
   * Examples:
   * - 30/01/2026 15:45 → "1.26.0130.11545"
   * - 15/12/2026 09:30 → "1.26.1215.10930"
   */
  generateVersion() {
    // Create a new Date object
    const now = new Date();

    // Adjust to Vietnam timezone (UTC+7)
    const vietnamTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));

    // Extract components: year, month, day, hour, minute
    const yy = String(vietnamTime.getFullYear()).slice(-2);
    const mm = String(vietnamTime.getMonth() + 1).padStart(2, "0");
    const dd = String(vietnamTime.getDate()).padStart(2, "0");
    const hh = String(vietnamTime.getHours()).padStart(2, "0");
    const MM = String(vietnamTime.getMinutes()).padStart(2, "0");

    // Return version string
    return `1.${yy}${mm}${dd}.1${hh}${MM}`;
  }

  /**
   * Create package.json for specific registry
   * @param {object} registry - Registry instance
   * @param {object} originalPkg - Original package.json content
   * @returns {object} { pkgPath: string, pkg: object }
   *
   * This creates a registry-specific package.json with:
   * - New auto-generated version
   * - Registry-specific package name (with scope if applicable)
   */
  async createRegistryPackage(registry, originalPkg) {
    const registryPkgPath = path.join(this.tmpDir, `package-${registry.name}.json`);
    const newVersion = this.generateVersion();

    // Clone package.json
    let registryPkg = { ...originalPkg };

    // Update version
    registryPkg.version = newVersion;

    // Update package name based on registry config
    if (registry.config.scope) {
      // Remove existing scope if any
      const baseName = registryPkg.name.replace(/^@[^/]+\//, "");
      registryPkg.name = `${registry.config.scope}/${baseName}`;
    }

    if (registry.config.package_name && registry.config.package_name + "" !== "") {
      registryPkg.name = registry.config.package_name;
    }
    if (registry.config.package_extra) {
      registryPkg = {
        ...registryPkg,
        ...registry.config.package_extra,
      };
    }

    // Write registry-specific package.json
    fs.writeFileSync(registryPkgPath, JSON.stringify(registryPkg, null, 2));

    return { pkgPath: registryPkgPath, pkg: registryPkg };
  }

  /**
   * Pack package for specific registry
   * @param {object} registry - Registry instance
   * @param {string} pkgPath - Path to registry-specific package.json
   * @returns {string} Path to created .tgz file
   *
   * Flow:
   * 1. Backup original package.json
   * 2. Replace with registry-specific package.json
   * 3. Run npm pack
   * 4. Rename .tgz with registry name prefix
   * 5. Restore original package.json
   */
  async packForRegistry(registry, pkgPath) {
    const spinner = ora(`Packing for ${registry.name}...`).start();

    try {
      // Backup original package.json
      const originalPkgPath = path.join(process.cwd(), "package.json");
      const backupPkgPath = path.join(this.tmpDir, "package.json.backup");
      fs.copyFileSync(originalPkgPath, backupPkgPath);

      // Replace with registry-specific package.json
      fs.copyFileSync(pkgPath, originalPkgPath);

      // Pack
      const packOutput = execSync("npm pack --json", { encoding: "utf-8" });
      const packInfo = JSON.parse(packOutput)[0];
      const artifactPath = packInfo.filename;

      // Move to registry-specific directory with registry name prefix
      const registryArtifactPath = path.join(this.tmpDir, `${registry.name}-${packInfo.filename}`);
      fs.renameSync(artifactPath, registryArtifactPath);

      // Restore original package.json
      fs.copyFileSync(backupPkgPath, originalPkgPath);

      spinner.succeed(`Package created for ${registry.name}`);
      console.log(chalk.gray(`   Name: ${packInfo.name}@${packInfo.version}`));
      console.log(chalk.gray(`   Size: ${(packInfo.size / 1024).toFixed(2)} KB`));
      console.log(chalk.gray(`   File: ${registryArtifactPath}`));

      return registryArtifactPath;
    } catch (error) {
      spinner.fail(`Pack failed for ${registry.name}`);
      throw error;
    }
  }

  /**
   * Main execution flow
   */
  async run() {
    console.log(chalk.bold("\n🚀 NPM Multi-Registry Publisher\n"));

    // Create temp directory
    if (!fs.existsSync(this.tmpDir)) {
      fs.mkdirSync(this.tmpDir, { recursive: true });
    }

    // 1. Build (if needed)
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

    // 2. Read original package.json
    const originalPkg = JSON.parse(fs.readFileSync("package.json", "utf-8"));
    console.log(chalk.bold(`\n📦 Original package: ${originalPkg.name}@${originalPkg.version}\n`));

    // 3. Validate all registries (non-blocking)
    console.log(chalk.bold("📋 Validating registries...\n"));
    const validatedRegistries = [];

    for (const registry of this.registries) {
      try {
        await registry.validate();
        console.log(chalk.green(`✓ ${registry.name}`));
        validatedRegistries.push(registry);
      } catch (error) {
        console.log(chalk.red(`✗ ${registry.name}: ${error.message}`));
        console.log(chalk.yellow(`   ⚠️  Skipping ${registry.name} due to validation error`));
      }
    }

    console.log("");

    if (validatedRegistries.length === 0) {
      throw new Error("❌ No registries passed validation. Cannot proceed.");
    }

    console.log(chalk.gray(`   ${validatedRegistries.length}/${this.registries.length} registries validated successfully\n`));

    // 4. Authenticate all (non-blocking)
    console.log(chalk.bold("🔑 Authenticating...\n"));
    const authenticatedRegistries = [];

    for (const registry of validatedRegistries) {
      try {
        await registry.authenticate();
        console.log(chalk.green(`✓ ${registry.name}`));
        authenticatedRegistries.push(registry);
      } catch (error) {
        console.log(chalk.red(`✗ ${registry.name}: ${error.message}`));
        console.log(chalk.yellow(`   ⚠️  Skipping ${registry.name} due to authentication error`));
      }
    }

    console.log("");

    if (authenticatedRegistries.length === 0) {
      throw new Error("❌ No registries passed authentication. Cannot proceed.");
    }

    console.log(chalk.blue(`📊 Ready to publish to ${authenticatedRegistries.length}/${this.registries.length} registry(ies)\n`));

    // 5. Create and publish to each registry
    console.log(chalk.bold("📦 Creating packages and publishing...\n"));
    const results = [];

    for (const registry of authenticatedRegistries) {
      if (this.options.dryRun) {
        console.log(chalk.cyan(`[DRY RUN] ${registry.name}`));
        results.push({
          registry: registry.name,
          success: true,
          dryRun: true,
        });
      } else {
        try {
          // Create registry-specific package
          const { pkgPath, pkg } = await this.createRegistryPackage(registry, originalPkg);
          console.log(chalk.blue(`📝 Package name for ${registry.name}: ${pkg.name}@${pkg.version}`));

          // Pack for registry
          const artifactPath = await this.packForRegistry(registry, pkgPath);

          // Publish
          const result = await registry.publish(artifactPath);
          results.push({
            registry: registry.name,
            packageName: pkg.name,
            version: pkg.version,
            ...result,
          });

          if (result.success) {
            console.log(chalk.green(`✓ ${registry.name} - ${pkg.name}@${pkg.version}`));
          } else {
            console.log(chalk.red(`✗ ${registry.name}: ${result.error}`));
          }
        } catch (error) {
          results.push({
            registry: registry.name,
            success: false,
            error: error.message,
          });
          console.log(chalk.red(`✗ ${registry.name}: ${error.message}`));
        }

        console.log("");
      }
    }

    // Add skipped registries to results
    const skippedRegistries = this.registries.filter((reg) => !authenticatedRegistries.includes(reg));

    for (const registry of skippedRegistries) {
      results.push({
        registry: registry.name,
        success: false,
        skipped: true,
        error: "Validation or authentication failed",
      });
    }

    // 6. Cleanup
    for (const registry of authenticatedRegistries) {
      try {
        await registry.cleanup();
      } catch (error) {
        console.log(chalk.yellow(`   ⚠️  Cleanup warning for ${registry.name}: ${error.message}`));
      }
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

    const successful = results.filter((r) => r.success && !r.dryRun);
    const failed = results.filter((r) => !r.success && !r.dryRun && !r.skipped);
    const skipped = results.filter((r) => r.skipped);
    const dryRun = results.filter((r) => r.dryRun);

    for (const result of results) {
      let icon, status;

      if (result.dryRun) {
        icon = "○";
        status = chalk.cyan("[DRY RUN]");
      } else if (result.skipped) {
        icon = "⊘";
        status = chalk.yellow("[SKIPPED]");
      } else if (result.success) {
        icon = "✅";
        status = chalk.green("[SUCCESS]");
      } else {
        icon = "❌";
        status = chalk.red("[FAILED]");
      }

      const pkgInfo = result.packageName && result.version ? ` - ${result.packageName}@${result.version}` : "";
      console.log(`${icon} ${result.registry}${pkgInfo} ${status}`);

      if (result.url) {
        console.log(chalk.gray(`   URL: ${result.url}`));
      }

      if (result.error && !result.success) {
        console.log(chalk.red(`   Error: ${result.error}`));
      }
    }

    console.log("");
    console.log(chalk.bold(`Total: ${results.length} | Success: ${successful.length} | Failed: ${failed.length} | Skipped: ${skipped.length}`));

    if (successful.length > 0) {
      console.log(chalk.green(`\n✅ Successfully published to ${successful.length} registry(ies)`));
    }

    if (failed.length > 0) {
      console.log(chalk.red(`\n❌ Failed to publish to ${failed.length} registry(ies)`));
    }

    if (skipped.length > 0) {
      console.log(chalk.yellow(`\n⚠️  Skipped ${skipped.length} registry(ies) due to validation/auth errors`));
    }
  }
}
