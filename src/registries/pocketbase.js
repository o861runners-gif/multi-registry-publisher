import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import FormData from 'form-data';
import { BaseRegistry } from '../core/registry.js';

export class PocketBaseRegistry extends BaseRegistry {
  async validate() {
    if (!this.config.url) {
      throw new Error('PocketBase registry requires url');
    }
    if (!this.config.collection) {
      throw new Error('PocketBase registry requires collection');
    }
    if (!this.config.email && !this.config.token) {
      throw new Error('PocketBase registry requires email/password or token');
    }
  }

  async authenticate() {
    // If token provided, use it directly
    if (this.config.token) {
      this.authToken = this.config.token;
      return;
    }

    // Otherwise authenticate with email/password
    if (!this.config.email || !this.config.password) {
      throw new Error('PocketBase requires email and password for authentication');
    }

    const response = await fetch(
      `${this.config.url}/api/admins/auth-with-password`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identity: this.config.email,
          password: this.config.password,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`PocketBase auth failed: ${response.statusText}`);
    }

    const data = await response.json();
    this.authToken = data.token;
  }

  async publish(artifactPath) {
    const fileName = path.basename(artifactPath);
    const fileStream = fs.createReadStream(artifactPath);

    const form = new FormData();
    form.append('file', fileStream);
    form.append('name', fileName);

    console.log(`📦 Uploading to PocketBase...`);
    console.log(`   Collection: ${this.config.collection}`);
    console.log(`   File: ${fileName}`);

    try {
      const response = await fetch(
        `${this.config.url}/api/collections/${this.config.collection}/records`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.authToken}`,
            ...form.getHeaders(),
          },
          body: form,
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Upload failed: ${error}`);
      }

      const data = await response.json();

      // Generate file URL
      const fileUrl = `${this.config.url}/api/files/${this.config.collection}/${data.id}/${data.file}`;
      console.log(`   File URL: ${fileUrl}`);

      return {
        success: true,
        url: fileUrl,
        recordId: data.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
