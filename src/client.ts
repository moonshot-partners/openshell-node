import { readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { createChannel, createClient, type Channel } from "nice-grpc";
import { credentials as grpcCredentials } from "@grpc/grpc-js";
import {
  OpenShellDefinition,
  type OpenShellClient as GeneratedClient,
} from "./generated/openshell.js";
import type { ExecSandboxEvent, CreateSandboxRequest } from "./generated/openshell.js";
import { SandboxPhase, type Sandbox as SandboxModel } from "./generated/datamodel.js";
import { serviceStatusToJSON } from "./generated/openshell.js";

export interface OpenShellClientOpts {
  /** gRPC gateway endpoint (e.g., "localhost:8080") */
  gateway: string;
  /** Cluster name for cert lookup (default: "openshell") */
  cluster?: string;
  /** Override cert directory (default: ~/.config/openshell/gateways/<cluster>/mtls/) */
  certsDir?: string;
  /** Use insecure (no TLS) connection — for testing only */
  insecure?: boolean;
}

export interface ExecCollectResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Thin wrapper around the generated nice-grpc OpenShell client.
 * Handles mTLS cert loading and provides typed convenience methods.
 */
export class OpenShellClient {
  private readonly channel: Channel;
  private readonly client: GeneratedClient;

  constructor(opts: OpenShellClientOpts) {
    const creds = opts.insecure ? grpcCredentials.createInsecure() : this.loadTlsCredentials(opts);

    this.channel = createChannel(opts.gateway, creds);
    this.client = createClient(OpenShellDefinition, this.channel);
  }

  async health(): Promise<{ status: string }> {
    const response = await this.client.health({});
    return { status: serviceStatusToJSON(response.status) };
  }

  async createSandbox(request: Partial<CreateSandboxRequest>): Promise<SandboxModel> {
    const response = await this.client.createSandbox(request);
    if (!response.sandbox) throw new Error("CreateSandbox returned no sandbox");
    return response.sandbox;
  }

  async getSandbox(name: string): Promise<SandboxModel> {
    const response = await this.client.getSandbox({ name });
    if (!response.sandbox) throw new Error(`Sandbox "${name}" not found`);
    return response.sandbox;
  }

  async listSandboxes(opts?: { limit?: number; offset?: number }): Promise<SandboxModel[]> {
    const response = await this.client.listSandboxes({
      limit: opts?.limit ?? 0,
      offset: opts?.offset ?? 0,
    });
    return response.sandboxes;
  }

  execSandbox(request: {
    sandboxId: string;
    command: string[];
    workdir?: string;
    environment?: Record<string, string>;
    timeoutSeconds?: number;
    stdin?: Uint8Array;
  }): AsyncIterable<ExecSandboxEvent> {
    return this.client.execSandbox({
      sandboxId: request.sandboxId,
      command: request.command,
      workdir: request.workdir ?? "",
      environment: request.environment ?? {},
      timeoutSeconds: request.timeoutSeconds ?? 0,
      stdin: request.stdin ?? new Uint8Array(),
    });
  }

  async deleteSandbox(name: string): Promise<void> {
    await this.client.deleteSandbox({ name });
  }

  /**
   * Poll getSandbox until phase is READY (or timeout).
   */
  async waitReady(name: string, timeoutMs = 120_000, pollMs = 1000): Promise<SandboxModel> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const sandbox = await this.getSandbox(name);
      if (sandbox.phase === SandboxPhase.SANDBOX_PHASE_READY) return sandbox;
      if (sandbox.phase === SandboxPhase.SANDBOX_PHASE_ERROR)
        throw new Error(`Sandbox "${name}" entered ERROR phase`);
      await new Promise((r) => setTimeout(r, pollMs));
    }
    throw new Error(`Sandbox "${name}" did not become ready within ${timeoutMs}ms`);
  }

  /**
   * Execute a command and collect all stdout/stderr into strings.
   * For one-shot commands like git clone, git diff, cat.
   */
  async execCollect(
    sandboxId: string,
    command: string[],
    opts?: { workdir?: string; environment?: Record<string, string>; timeoutSeconds?: number },
  ): Promise<ExecCollectResult> {
    let stdout = "";
    let stderr = "";
    let exitCode = 0;

    for await (const event of this.execSandbox({
      sandboxId,
      command,
      ...opts,
    })) {
      if (event.stdout) {
        stdout += new TextDecoder().decode(event.stdout.data);
      } else if (event.stderr) {
        stderr += new TextDecoder().decode(event.stderr.data);
      } else if (event.exit) {
        exitCode = event.exit.exitCode;
      }
    }

    return { stdout, stderr, exitCode };
  }

  close(): void {
    this.channel.close();
  }

  private loadTlsCredentials(opts: OpenShellClientOpts) {
    const cluster = opts.cluster ?? "openshell";
    const certsDir =
      opts.certsDir ?? join(homedir(), ".config", "openshell", "gateways", cluster, "mtls");

    const caCert = readFileSync(join(certsDir, "ca.crt"));
    const clientCert = readFileSync(join(certsDir, "tls.crt"));
    const clientKey = readFileSync(join(certsDir, "tls.key"));

    return grpcCredentials.createSsl(caCert, clientKey, clientCert);
  }
}
