import fs from 'fs';
import path from 'path';
import { replaceEnvVarsDeep, hasUnresolvedVars } from './replacer.js';

/**
 * Load config với full defaults support
 */
export function loadConfig(configPath = '.publishrc.json') {
  let config = {};

  // 1. Load file nếu tồn tại
  if (fs.existsSync(configPath)) {
    const raw = fs.readFileSync(configPath, 'utf-8');
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
    console.warn(`⚠️  Unresolved variables: ${unresolved.join(', ')}`);
    console.warn('   These registries may fail if enabled');
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
    config.npm.defaultArgs = ['--no-git-checks'];
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
    access: 'public',
  };

  // Type-specific defaults
  if (registry.type === 'npm') {
    defaults.registry = defaults.registry || 'https://registry.npmjs.org';
  }

  return { ...defaults, ...registry };
}

/**
 * Auto-detect build command từ package.json
 */
function detectBuildCommand() {
  try {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));

    if (pkg.scripts?.build) {
      return 'npm run build';
    }

    return null; // Không có build script
  } catch (err) {
    console.warn('⚠️  Cannot read package.json');
    return null;
  }
}
