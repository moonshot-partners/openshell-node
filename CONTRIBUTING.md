# Contributing

## Development Setup

```bash
# Clone and install
git clone https://github.com/moonshot-partners/openshell-node.git
cd openshell-node
pnpm install

# Build
pnpm build

# Run tests
pnpm test
```

## Testing

### Unit Tests

```bash
pnpm test          # Run once
pnpm test:watch    # Watch mode
```

### Integration Tests

Integration tests require a running OpenShell gateway:

```bash
openshell gateway start
OPENSHELL_TEST=1 pnpm test:integration
```

## Proto Regeneration

If the OpenShell proto files are updated upstream:

```bash
# Option 1: Sync from a local OpenShell checkout
./scripts/sync-protos.sh /path/to/OpenShell

# Option 2: Manually update proto/ files

# Then regenerate TypeScript
pnpm generate
```

Requires `protoc` installed (`brew install protobuf` on macOS).

## Commit Conventions

This project uses [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`

Examples:

- `feat: add watchSandbox streaming method`
- `fix: handle timeout in waitReady correctly`
- `docs: update API reference`

Enforced by commitlint via a pre-commit hook.

## Release Process

Releases are triggered by pushing a version tag:

```bash
# Bump version in package.json
npm version patch  # or minor, major

# Push tag to trigger publish workflow
git push --follow-tags
```

## Code Style

- TypeScript strict mode
- Prettier for formatting (auto-applied on commit via lint-staged)
- ESLint for linting
- Generated code in `src/generated/` is excluded from lint/format
