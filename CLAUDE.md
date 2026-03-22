# openshell-node

TypeScript gRPC client for NVIDIA OpenShell sandboxes. First community Node.js/TypeScript client.

## Architecture

```
src/
├── index.ts          — Curated barrel exports (public API)
├── client.ts         — OpenShellClient class (thin gRPC wrapper, mTLS)
├── stream.ts         — streamExecLines() line-buffering utility
├── generated/        — ts-proto output from .proto files (committed)
│   ├── index.ts        Re-export barrel for subpath import
│   ├── openshell.ts    gRPC service definitions + RPC types
│   ├── datamodel.ts    Sandbox model, phases, providers
│   └── sandbox.ts      Security policies
└── __tests__/
    ├── client.test.ts       Unit tests (mocked gRPC)
    ├── stream.test.ts       Line-buffering tests
    └── integration.test.ts  Real gateway tests (gated)

proto/                — Vendored .proto files from NVIDIA OpenShell
scripts/              — Proto generation + sync scripts
examples/             — Usage examples
```

## Commands

```bash
pnpm install          # Install dependencies
pnpm build            # Build with tsup (dual CJS/ESM)
pnpm test             # Run unit tests
pnpm test:integration # Run against real gateway (needs OPENSHELL_TEST=1)
pnpm typecheck        # Type check
pnpm lint             # Lint (excludes generated code)
pnpm format           # Format
pnpm generate         # Regenerate TS from .proto (needs protoc)
```

## Key Design Decisions

- **Generated code is committed** — consumers don't need protoc
- **Curated barrel exports** — index.ts re-exports commonly used types; advanced users import from `openshell-node/generated`
- **Dual CJS/ESM** — built with tsup for maximum compatibility
- **`@bufbuild/protobuf` is a peer dep** — avoids version conflicts

## Testing

- Unit tests mock the nice-grpc channel and client
- Integration tests gated behind `OPENSHELL_TEST=1` env var
- Generated code excluded from lint and format

## Commit Conventions

Format: `type(scope): description`
Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`
