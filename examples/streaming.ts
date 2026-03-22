/**
 * Streaming example: execute a long-running command and process output line by line.
 *
 * Prerequisites:
 *   openshell gateway start
 *
 * Run:
 *   npx tsx examples/streaming.ts
 */

import { OpenShellClient, streamExecLines } from "../src/index.js";

async function main() {
  const client = new OpenShellClient({
    gateway: "127.0.0.1:8080",
    cluster: "openshell",
  });

  const sandboxName = `streaming-example-${Date.now()}`;
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

  await client.waitReady(sandboxName, 120_000);

  // Stream command output line by line
  const stream = client.execSandbox({
    sandboxId: sandbox.id,
    command: ["bash", "-c", 'for i in $(seq 1 5); do echo "Processing item $i..."; sleep 0.5; done'],
  });

  console.log("Streaming output:");
  for await (const event of streamExecLines(stream)) {
    switch (event.type) {
      case "stdout":
        console.log(`  [stdout] ${event.line}`);
        break;
      case "stderr":
        console.log(`  [stderr] ${event.line}`);
        break;
      case "exit":
        console.log(`  [exit] code=${event.exitCode}`);
        break;
    }
  }

  await client.deleteSandbox(sandboxName);
  client.close();
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
