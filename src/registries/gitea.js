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
        ...this.config,
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
