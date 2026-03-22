# openshell-node

[![CI](https://github.com/moonshot-partners/openshell-node/actions/workflows/ci.yml/badge.svg)](https://github.com/moonshot-partners/openshell-node/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/openshell-node.svg)](https://badge.fury.io/js/openshell-node)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> TypeScript gRPC client for [NVIDIA OpenShell](https://github.com/NVIDIA/OpenShell) sandboxes

The first community TypeScript/Node.js client for NVIDIA OpenShell. Create, manage, and execute commands in isolated sandbox environments with full type safety.

## Features

- Typed wrapper around the OpenShell gRPC API (30+ RPCs)
- mTLS authentication with automatic cert discovery
- Streaming command execution with line buffering
- Convenience helpers: `execCollect()`, `waitReady()`, `streamExecLines()`
- Dual CJS/ESM build with full TypeScript declarations
- Zero dependencies beyond gRPC runtime

## Installation

```bash
npm install openshell-node @bufbuild/protobuf
# or
pnpm add openshell-node @bufbuild/protobuf
```

`@bufbuild/protobuf` is a peer dependency required by the generated protobuf code.

## Prerequisites

You need a running OpenShell gateway. See the [OpenShell docs](https://docs.nvidia.com/openshell/latest/index.html) for installation.

```bash
# Start the gateway
openshell gateway start
```

## Quick Start

```typescript
import { OpenShellClient } from "openshell-node";

const client = new OpenShellClient({
  gateway: "127.0.0.1:8080",
  cluster: "openshell",
});

// Health check
const health = await client.health();
console.log("Status:", health.status);

// Create a sandbox
const sandbox = await client.createSandbox({
  name: "my-sandbox",
  spec: {
    template: { image: "" }, // uses default image
    providers: [],
    environment: {},
    gpu: false,
  },
});

// Wait until ready
await client.waitReady("my-sandbox");

// Execute a command
const result = await client.execCollect(sandbox.id, ["echo", "Hello!"]);
console.log(result.stdout); // "Hello!\n"

// Clean up
await client.deleteSandbox("my-sandbox");
client.close();
```

## API Reference

### `new OpenShellClient(opts)`

Create a new client connected to an OpenShell gateway.

| Option     | Type      | Default                                        | Description                              |
| ---------- | --------- | ---------------------------------------------- | ---------------------------------------- |
| `gateway`  | `string`  | (required)                                     | gRPC endpoint (e.g., `"localhost:8080"`) |
| `cluster`  | `string`  | `"openshell"`                                  | Cluster name for cert lookup             |
| `certsDir` | `string`  | `~/.config/openshell/gateways/<cluster>/mtls/` | Override cert directory                  |
| `insecure` | `boolean` | `false`                                        | Skip TLS (testing only)                  |

### Methods

#### `client.health(): Promise<{ status: string }>`

Check gateway health.

#### `client.createSandbox(request): Promise<SandboxModel>`

Create a new sandbox. Throws if the response contains no sandbox.

#### `client.getSandbox(name): Promise<SandboxModel>`

Get a sandbox by name. Throws if not found.

#### `client.listSandboxes(opts?): Promise<SandboxModel[]>`

List sandboxes with optional `limit` and `offset`.

#### `client.waitReady(name, timeoutMs?, pollMs?): Promise<SandboxModel>`

Poll until sandbox reaches READY phase. Throws on ERROR phase or timeout.

#### `client.execSandbox(request): AsyncIterable<ExecSandboxEvent>`

Stream command execution. Returns an async iterable of stdout/stderr/exit events.

#### `client.execCollect(sandboxId, command, opts?): Promise<ExecCollectResult>`

Execute a command and collect all output into `{ stdout, stderr, exitCode }`.

#### `client.deleteSandbox(name): Promise<void>`

Delete a sandbox by name.

#### `client.close(): void`

Close the gRPC channel.

### `streamExecLines(grpcStream): AsyncGenerator<ExecStreamEvent>`

Buffer gRPC streaming events into complete lines. Handles partial lines split across chunks.

```typescript
import { streamExecLines } from "openshell-node";

const stream = client.execSandbox({
  sandboxId: sandbox.id,
  command: ["bash", "-c", "echo line1; echo line2"],
});

for await (const event of streamExecLines(stream)) {
  if (event.type === "stdout") console.log(event.line);
  if (event.type === "exit") console.log("Exit:", event.exitCode);
}
```

## Authentication

The client loads mTLS certificates from the standard OpenShell location:

```
~/.config/openshell/gateways/<cluster>/mtls/
  ca.crt
  tls.crt
  tls.key
```

These are created automatically by `openshell gateway start`. Override with the `certsDir` option.

For testing without TLS, use `insecure: true`.

## Advanced: Raw Generated Types

For access to all generated protobuf types (security policies, providers, SSH sessions, etc.):

```typescript
import { SandboxPolicy, NetworkPolicyRule } from "openshell-node/generated";
```

## Releasing

```bash
npm version patch   # or minor/major — bumps package.json, creates git tag
git push --follow-tags  # tag push triggers CI → npm publish + GitHub Release
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup and guidelines.

## License

MIT
