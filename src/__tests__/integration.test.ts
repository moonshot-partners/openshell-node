import { describe, it, expect, afterAll } from "vitest";
import { OpenShellClient } from "../client.js";
import { SandboxPhase } from "../generated/datamodel.js";
import { streamExecLines } from "../stream.js";

const GATEWAY = process.env.OPENSHELL_GATEWAY ?? "127.0.0.1:8080";

/**
 * Integration tests against a real OpenShell gateway.
 * Gated behind OPENSHELL_TEST=1 environment variable.
 *
 * Prerequisites:
 *   openshell gateway start
 */
describe.runIf(process.env.OPENSHELL_TEST)("OpenShellClient (integration)", () => {
  const client = new OpenShellClient({ gateway: GATEWAY, cluster: "openshell" });
  const sandboxesToClean: string[] = [];

  afterAll(async () => {
    for (const name of sandboxesToClean) {
      try {
        await client.deleteSandbox(name);
      } catch {
        // already deleted
      }
    }
    client.close();
  });

  async function createTestSandbox(suffix: string) {
    const name = `integration-test-${suffix}-${Date.now()}`;
    sandboxesToClean.push(name);
    const sandbox = await client.createSandbox({
      name,
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
    return { sandbox, name };
  }

  it("health check", async () => {
    const health = await client.health();
    expect(health.status).toBeDefined();
    expect(typeof health.status).toBe("string");
  });

  it("full lifecycle: create, wait, exec, delete", async () => {
    const { sandbox, name } = await createTestSandbox("lifecycle");
    expect(sandbox.id).toBeTruthy();

    const ready = await client.waitReady(name, 120_000);
    expect(ready.phase).toBe(SandboxPhase.SANDBOX_PHASE_READY);

    const result = await client.execCollect(sandbox.id, ["echo", "hello from openshell"]);
    expect(result.stdout.trim()).toBe("hello from openshell");
    expect(result.exitCode).toBe(0);

    await client.deleteSandbox(name);
    sandboxesToClean.splice(sandboxesToClean.indexOf(name), 1);
  }, 180_000);

  it("streaming exec with streamExecLines", async () => {
    const { sandbox, name } = await createTestSandbox("streaming");
    await client.waitReady(name, 120_000);

    const lines: string[] = [];
    const stream = client.execSandbox({
      sandboxId: sandbox.id,
      command: ["bash", "-c", 'for i in 1 2 3; do echo "line $i"; done'],
    });

    for await (const event of streamExecLines(stream)) {
      if (event.type === "stdout") lines.push(event.line);
    }

    expect(lines).toEqual(["line 1", "line 2", "line 3"]);
  }, 180_000);

  it("listSandboxes returns created sandbox", async () => {
    const { name } = await createTestSandbox("list");
    await client.waitReady(name, 120_000);

    const sandboxes = await client.listSandboxes();
    const found = sandboxes.find((s) => s.name === name);
    expect(found).toBeDefined();
  }, 180_000);
});
