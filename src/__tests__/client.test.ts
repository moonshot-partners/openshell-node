import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock node:fs before importing client
vi.mock("node:fs", () => ({
  readFileSync: vi.fn(() => Buffer.from("mock-cert-data")),
}));

// Mock @grpc/grpc-js
vi.mock("@grpc/grpc-js", () => ({
  credentials: {
    createInsecure: vi.fn(() => "insecure-creds"),
    createSsl: vi.fn(() => "ssl-creds"),
  },
}));

// Mock nice-grpc
const mockClient = {
  health: vi.fn(),
  createSandbox: vi.fn(),
  getSandbox: vi.fn(),
  listSandboxes: vi.fn(),
  deleteSandbox: vi.fn(),
  execSandbox: vi.fn(),
};

const mockChannel = { close: vi.fn() };

vi.mock("nice-grpc", () => ({
  createChannel: vi.fn(() => mockChannel),
  createClient: vi.fn(() => mockClient),
}));

import { OpenShellClient } from "../client.js";
import { SandboxPhase } from "../generated/datamodel.js";
import { credentials as grpcCredentials } from "@grpc/grpc-js";
import { createChannel } from "nice-grpc";

describe("OpenShellClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("creates insecure channel when insecure option is set", () => {
      new OpenShellClient({ gateway: "localhost:8080", insecure: true });

      expect(grpcCredentials.createInsecure).toHaveBeenCalled();
      expect(createChannel).toHaveBeenCalledWith("localhost:8080", "insecure-creds");
    });

    it("creates SSL channel with mTLS certs by default", () => {
      new OpenShellClient({ gateway: "localhost:8080" });

      expect(grpcCredentials.createSsl).toHaveBeenCalled();
      expect(createChannel).toHaveBeenCalledWith("localhost:8080", "ssl-creds");
    });
  });

  describe("health", () => {
    it("returns parsed status string", async () => {
      mockClient.health.mockResolvedValue({ status: 1 }); // SERVICE_STATUS_SERVING = 1

      const client = new OpenShellClient({ gateway: "localhost:8080", insecure: true });
      const result = await client.health();

      expect(result).toEqual({ status: expect.any(String) });
    });
  });

  describe("createSandbox", () => {
    it("returns sandbox from response", async () => {
      const sandbox = { id: "sb-123", name: "test", phase: SandboxPhase.SANDBOX_PHASE_READY };
      mockClient.createSandbox.mockResolvedValue({ sandbox });

      const client = new OpenShellClient({ gateway: "localhost:8080", insecure: true });
      const result = await client.createSandbox({ name: "test" });

      expect(result).toEqual(sandbox);
    });

    it("throws when response has no sandbox", async () => {
      mockClient.createSandbox.mockResolvedValue({});

      const client = new OpenShellClient({ gateway: "localhost:8080", insecure: true });
      await expect(client.createSandbox({ name: "test" })).rejects.toThrow(
        "CreateSandbox returned no sandbox",
      );
    });
  });

  describe("getSandbox", () => {
    it("returns sandbox by name", async () => {
      const sandbox = { id: "sb-123", name: "test", phase: SandboxPhase.SANDBOX_PHASE_READY };
      mockClient.getSandbox.mockResolvedValue({ sandbox });

      const client = new OpenShellClient({ gateway: "localhost:8080", insecure: true });
      const result = await client.getSandbox("test");

      expect(result).toEqual(sandbox);
      expect(mockClient.getSandbox).toHaveBeenCalledWith({ name: "test" });
    });

    it("throws when sandbox not found", async () => {
      mockClient.getSandbox.mockResolvedValue({});

      const client = new OpenShellClient({ gateway: "localhost:8080", insecure: true });
      await expect(client.getSandbox("missing")).rejects.toThrow('Sandbox "missing" not found');
    });
  });

  describe("listSandboxes", () => {
    it("returns list of sandboxes", async () => {
      const sandboxes = [
        { id: "sb-1", name: "test-1" },
        { id: "sb-2", name: "test-2" },
      ];
      mockClient.listSandboxes.mockResolvedValue({ sandboxes });

      const client = new OpenShellClient({ gateway: "localhost:8080", insecure: true });
      const result = await client.listSandboxes();

      expect(result).toEqual(sandboxes);
      expect(mockClient.listSandboxes).toHaveBeenCalledWith({ limit: 0, offset: 0 });
    });

    it("passes limit and offset options", async () => {
      mockClient.listSandboxes.mockResolvedValue({ sandboxes: [] });

      const client = new OpenShellClient({ gateway: "localhost:8080", insecure: true });
      await client.listSandboxes({ limit: 10, offset: 5 });

      expect(mockClient.listSandboxes).toHaveBeenCalledWith({ limit: 10, offset: 5 });
    });
  });

  describe("deleteSandbox", () => {
    it("calls delete with name", async () => {
      mockClient.deleteSandbox.mockResolvedValue({});

      const client = new OpenShellClient({ gateway: "localhost:8080", insecure: true });
      await client.deleteSandbox("test");

      expect(mockClient.deleteSandbox).toHaveBeenCalledWith({ name: "test" });
    });
  });

  describe("execCollect", () => {
    it("collects stdout, stderr, and exit code from stream", async () => {
      async function* fakeStream() {
        yield { stdout: { data: new TextEncoder().encode("hello ") } };
        yield { stdout: { data: new TextEncoder().encode("world") } };
        yield { stderr: { data: new TextEncoder().encode("warn") } };
        yield { exit: { exitCode: 0 } };
      }
      mockClient.execSandbox.mockReturnValue(fakeStream());

      const client = new OpenShellClient({ gateway: "localhost:8080", insecure: true });
      const result = await client.execCollect("sb-123", ["echo", "hello"]);

      expect(result).toEqual({
        stdout: "hello world",
        stderr: "warn",
        exitCode: 0,
      });
    });

    it("returns non-zero exit code", async () => {
      async function* fakeStream() {
        yield { stderr: { data: new TextEncoder().encode("error") } };
        yield { exit: { exitCode: 1 } };
      }
      mockClient.execSandbox.mockReturnValue(fakeStream());

      const client = new OpenShellClient({ gateway: "localhost:8080", insecure: true });
      const result = await client.execCollect("sb-123", ["false"]);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toBe("error");
    });
  });

  describe("waitReady", () => {
    it("returns when sandbox reaches READY phase", async () => {
      const sandbox = { id: "sb-123", name: "test", phase: SandboxPhase.SANDBOX_PHASE_READY };
      mockClient.getSandbox.mockResolvedValue({ sandbox });

      const client = new OpenShellClient({ gateway: "localhost:8080", insecure: true });
      const result = await client.waitReady("test");

      expect(result.phase).toBe(SandboxPhase.SANDBOX_PHASE_READY);
    });

    it("throws on ERROR phase", async () => {
      const sandbox = { id: "sb-123", name: "test", phase: SandboxPhase.SANDBOX_PHASE_ERROR };
      mockClient.getSandbox.mockResolvedValue({ sandbox });

      const client = new OpenShellClient({ gateway: "localhost:8080", insecure: true });
      await expect(client.waitReady("test")).rejects.toThrow('Sandbox "test" entered ERROR phase');
    });

    it("throws on timeout", async () => {
      const sandbox = {
        id: "sb-123",
        name: "test",
        phase: SandboxPhase.SANDBOX_PHASE_PROVISIONING,
      };
      mockClient.getSandbox.mockResolvedValue({ sandbox });

      const client = new OpenShellClient({ gateway: "localhost:8080", insecure: true });
      await expect(client.waitReady("test", 50, 10)).rejects.toThrow(
        'Sandbox "test" did not become ready within 50ms',
      );
    });
  });

  describe("close", () => {
    it("closes the channel", () => {
      const client = new OpenShellClient({ gateway: "localhost:8080", insecure: true });
      client.close();

      expect(mockChannel.close).toHaveBeenCalled();
    });
  });
});
