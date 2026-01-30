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
    throw new Error('validate() must be implemented');
  }

  /**
   * Authenticate với registry
   * @throws {Error} nếu auth fail
   */
  async authenticate() {
    throw new Error('authenticate() must be implemented');
  }

  /**
   * Publish package
   * @param {string} artifactPath - Path to .tgz file
   * @returns {object} - {success: boolean, error?: string}
   */
  async publish(artifactPath) {
    throw new Error('publish() must be implemented');
  }

  /**
   * Cleanup (xóa temp files, .npmrc...)
   */
  async cleanup() {
    // Optional override
  }
}
