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
        access: "public", // GitHub Packages luôn là restricted
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
