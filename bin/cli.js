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
