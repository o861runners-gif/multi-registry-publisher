/**
 * Replace {{VAR}} với process.env
 * @param {string} template - String chứa {{VAR}}
 * @param {object} env - Environment variables (default: process.env)
 * @returns {string} - String đã replace
 */
export function replaceEnvVars(template, env = process.env) {
  if (typeof template !== 'string') return template;

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
  if (typeof obj === 'string') {
    return replaceEnvVars(obj, env);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => replaceEnvVarsDeep(item, env));
  }

  if (obj && typeof obj === 'object') {
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
