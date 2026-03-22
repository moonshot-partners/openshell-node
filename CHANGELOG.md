# Changelog

## [0.1.0] - 2026-03-22

### Added

- `OpenShellClient` — typed gRPC wrapper with mTLS cert loading
- `streamExecLines()` — line-buffering utility for streaming exec output
- Methods: `health()`, `createSandbox()`, `getSandbox()`, `listSandboxes()`, `execSandbox()`, `execCollect()`, `waitReady()`, `deleteSandbox()`
- Vendored OpenShell proto files (openshell, datamodel, sandbox)
- Pre-generated TypeScript bindings (ts-proto + nice-grpc)
- Unit tests for client and stream utility
- Integration tests (gated behind `OPENSHELL_TEST=1`)
- CI/CD with GitHub Actions (lint, typecheck, test, publish)
- Husky + lint-staged + commitlint for commit quality
