# Contributing to npm-multi-publish

Thank you for your interest in contributing! 🎉

## Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/yourusername/npm-multi-publish.git
   cd npm-multi-publish
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Make the CLI executable**
   ```bash
   chmod +x bin/cli.js
   ```

4. **Link for local development**
   ```bash
   npm link
   ```

## Project Structure

```
npm-multi-publish/
├── src/
│   ├── core/           # Core publisher logic
│   ├── registries/     # Registry implementations
│   ├── config/         # Configuration handling
│   ├── auth/           # Authentication
│   └── utils/          # Utilities
├── bin/
│   └── cli.js          # CLI entry point
└── config/
    └── templates/      # Config templates
```

## Adding a New Registry Type

1. Create a new file in `src/registries/your-registry.js`
2. Extend `BaseRegistry` class
3. Implement required methods:
   - `validate()`
   - `authenticate()`
   - `publish(artifactPath)`
   - `cleanup()` (optional)

Example:

```javascript
import { BaseRegistry } from '../core/registry.js';

export class YourRegistry extends BaseRegistry {
  async validate() {
    if (!this.config.requiredField) {
      throw new Error('Missing required field');
    }
  }

  async authenticate() {
    // Auth logic here
  }

  async publish(artifactPath) {
    // Publish logic here
    return { success: true };
  }
}
```

4. Register in `src/core/publisher.js`:
```javascript
import { YourRegistry } from '../registries/your-registry.js';

const REGISTRY_TYPES = {
  // ...
  yourtype: YourRegistry,
};
```

## Code Style

- Use ES6 modules
- Use async/await for async operations
- Add JSDoc comments for functions
- Keep functions focused and small
- Use meaningful variable names

## Testing

Currently focusing on core functionality. Test suite coming soon!

## Pull Request Process

1. Create a feature branch
2. Make your changes
3. Update documentation if needed
4. Submit a pull request
5. Wait for review

## Questions?

Open an issue or reach out to the maintainers.

Thank you for contributing! 🙏
