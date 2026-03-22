// Client
export { OpenShellClient } from "./client.js";
export type { OpenShellClientOpts, ExecCollectResult } from "./client.js";

// Stream utility
export { streamExecLines } from "./stream.js";
export type { ExecLine, ExecExit, ExecStreamEvent } from "./stream.js";

// Key generated types used by client method signatures
export type {
  CreateSandboxRequest,
  ExecSandboxEvent,
  ExecSandboxRequest,
  HealthResponse,
  SandboxResponse,
  ListSandboxesResponse,
} from "./generated/openshell.js";

export {
  ServiceStatus,
  serviceStatusToJSON,
  serviceStatusFromJSON,
  OpenShellDefinition,
} from "./generated/openshell.js";

export type {
  Sandbox as SandboxModel,
  SandboxSpec,
  SandboxTemplate,
  SandboxStatus,
  SandboxCondition,
  Provider,
} from "./generated/datamodel.js";

export { SandboxPhase, sandboxPhaseToJSON, sandboxPhaseFromJSON } from "./generated/datamodel.js";

export type {
  SandboxPolicy,
  FilesystemPolicy,
  ProcessPolicy,
  NetworkPolicyRule,
} from "./generated/sandbox.js";
