import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import FormData from 'form-data';
import { BaseRegistry } from '../core/registry.js';

export class SupabaseRegistry extends BaseRegistry {
  async validate() {
    if (!this.config.url) {
      throw new Error('Supabase registry requires url');
    }
    if (!this.config.bucket) {
      throw new Error('Supabase registry requires bucket');
    }
    if (!this.config.serviceKey) {
      throw new Error('Supabase registry requires serviceKey');
    }
  }

  async authenticate() {
    // Test connection
    const response = await fetch(
      `${this.config.url}/storage/v1/bucket/${this.config.bucket}`,
      {
        headers: {
          Authorization: `Bearer ${this.config.serviceKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Supabase auth failed: ${response.statusText}`);
    }
  }

  async publish(artifactPath) {
    const fileName = path.basename(artifactPath);
    const fileStream = fs.createReadStream(artifactPath);

    const form = new FormData();
    form.append('file', fileStream);

    console.log(`📦 Uploading to Supabase Storage...`);
    console.log(`   Bucket: ${this.config.bucket}`);
    console.log(`   File: ${fileName}`);

    try {
      const response = await fetch(
        `${this.config.url}/storage/v1/object/${this.config.bucket}/${fileName}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.config.serviceKey}`,
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

      // Generate public URL if configured
      let publicUrl = null;
      if (this.config.public) {
        publicUrl = `${this.config.url}/storage/v1/object/public/${this.config.bucket}/${fileName}`;
        console.log(`   Public URL: ${publicUrl}`);
      }

      return {
        success: true,
        url: publicUrl,
        key: data.Key,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
