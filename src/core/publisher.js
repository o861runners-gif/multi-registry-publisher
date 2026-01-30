import { execSync } from 'child_process';
import { NpmRegistry } from '../registries/npm.js';
import { GitHubRegistry } from '../registries/github.js';
import { GiteaRegistry } from '../registries/gitea.js';
import { SupabaseRegistry } from '../registries/supabase.js';
import { PocketBaseRegistry } from '../registries/pocketbase.js';
import chalk from 'chalk';
import ora from 'ora';

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
      throw new Error('No enabled registries found');
    }

    return registries;
  }

  /**
   * Main execution flow
   */
  async run() {
    console.log(chalk.bold('\n🚀 NPM Multi-Registry Publisher\n'));

    // 1. Build (if needed)
    let artifactPath;
    if (!this.options.skipBuild && this.config.build?.command) {
      const spinner = ora('Building package...').start();
      try {
        execSync(this.config.build.command, { stdio: 'pipe' });
        spinner.succeed('Build completed');
      } catch (error) {
        spinner.fail('Build failed');
        throw error;
      }
    }

    // 2. Pack
    const spinner = ora('Packing package...').start();
    try {
      const packOutput = execSync('npm pack --json', { encoding: 'utf-8' });
      const packInfo = JSON.parse(packOutput)[0];
      artifactPath = packInfo.filename;

      spinner.succeed('Package created');
      console.log(chalk.gray(`   Name: ${packInfo.name}@${packInfo.version}`));
      console.log(chalk.gray(`   Size: ${(packInfo.size / 1024).toFixed(2)} KB`));
      console.log(chalk.gray(`   File: ${artifactPath}`));
    } catch (error) {
      spinner.fail('Pack failed');
      throw error;
    }

    console.log('');

    // 3. Validate all registries
    console.log(chalk.bold('📋 Validating registries...\n'));
    for (const registry of this.registries) {
      try {
        await registry.validate();
        console.log(chalk.green(`✓ ${registry.name}`));
      } catch (error) {
        console.log(chalk.red(`✗ ${registry.name}: ${error.message}`));
        throw error;
      }
    }

    console.log('');

    // 4. Authenticate all
    console.log(chalk.bold('🔑 Authenticating...\n'));
    for (const registry of this.registries) {
      try {
        await registry.authenticate();
        console.log(chalk.green(`✓ ${registry.name}`));
      } catch (error) {
        console.log(chalk.red(`✗ ${registry.name}: ${error.message}`));
        throw error;
      }
    }

    console.log('');

    // 5. Publish to each registry
    console.log(chalk.bold('📦 Publishing...\n'));
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

    console.log('');

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
    console.log(chalk.bold('📊 Summary:\n'));

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success && !r.dryRun);

    for (const result of results) {
      const icon = result.dryRun ? '○' : result.success ? '✅' : '❌';
      const status = result.dryRun
        ? chalk.cyan('[DRY RUN]')
        : result.success
        ? chalk.green('[SUCCESS]')
        : chalk.red('[FAILED]');
      console.log(`${icon} ${result.registry} ${status}`);

      if (result.url) {
        console.log(chalk.gray(`   URL: ${result.url}`));
      }
    }

    console.log('');
    console.log(
      chalk.bold(`Total: ${results.length} | Success: ${successful.length} | Failed: ${failed.length}`)
    );
  }
}
