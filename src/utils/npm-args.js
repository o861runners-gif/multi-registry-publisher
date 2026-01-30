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
  if (registryConfig.registry && registryConfig.type !== "gitea") {
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
