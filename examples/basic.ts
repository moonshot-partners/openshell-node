/**
 * Basic example: connect to OpenShell, create a sandbox, execute a command, and clean up.
 *
 * Prerequisites:
 *   openshell gateway start
 *
 * Run:
 *   npx tsx examples/basic.ts
 */

import { OpenShellClient } from "../src/index.js";

async function main() {
  // 1. Connect to gateway
  const client = new OpenShellClient({
    gateway: "127.0.0.1:8080",
    cluster: "openshell",
  });

  // 2. Health check
  const health = await client.health();
  console.log("Gateway status:", health.status);

  // 3. Create sandbox
  const sandboxName = `example-${Date.now()}`;
  console.log(`Creating sandbox "${sandboxName}"...`);
  const sandbox = await client.createSandbox({
    name: sandboxName,
    spec: {
      logLevel: "",
      template: {
        image: "",
        runtimeClassName: "",
        agentSocket: "",
        labels: {},
        annotations: {},
        environment: {},
        resources: undefined,
        volumeClaimTemplates: undefined,
      },
      policy: undefined,
      providers: [],
      environment: {},
      gpu: false,
    },
  });

  // 4. Wait for ready
  console.log("Waiting for sandbox to be ready...");
  await client.waitReady(sandboxName, 120_000);

  // 5. Execute a command
  const result = await client.execCollect(sandbox.id, ["echo", "Hello from OpenShell!"]);
  console.log("Output:", result.stdout.trim());
  console.log("Exit code:", result.exitCode);

  // 6. Clean up
  await client.deleteSandbox(sandboxName);
  console.log("Sandbox deleted.");

  client.close();
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
