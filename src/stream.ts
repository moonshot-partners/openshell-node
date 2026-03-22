import type { ExecSandboxEvent } from "./generated/openshell.js";

const decoder = new TextDecoder();

export interface ExecLine {
  type: "stdout" | "stderr";
  line: string;
}

export interface ExecExit {
  type: "exit";
  exitCode: number;
}

export type ExecStreamEvent = ExecLine | ExecExit;

/**
 * Buffer gRPC ExecSandbox streaming events into complete lines.
 *
 * gRPC delivers stdout/stderr as byte chunks that may split lines across
 * messages. This generator buffers partial lines and yields them only when
 * a newline is received (or the process exits).
 */
export async function* streamExecLines(
  grpcStream: AsyncIterable<ExecSandboxEvent>,
): AsyncGenerator<ExecStreamEvent> {
  let stdoutBuf = "";
  let stderrBuf = "";

  for await (const event of grpcStream) {
    if (event.stdout) {
      stdoutBuf += decoder.decode(event.stdout.data);
      const lines = stdoutBuf.split("\n");
      stdoutBuf = lines.pop() ?? "";
      for (const line of lines) {
        if (line) yield { type: "stdout", line };
      }
    } else if (event.stderr) {
      stderrBuf += decoder.decode(event.stderr.data);
      const lines = stderrBuf.split("\n");
      stderrBuf = lines.pop() ?? "";
      for (const line of lines) {
        if (line) yield { type: "stderr", line };
      }
    } else if (event.exit) {
      if (stdoutBuf) {
        yield { type: "stdout", line: stdoutBuf };
        stdoutBuf = "";
      }
      if (stderrBuf) {
        yield { type: "stderr", line: stderrBuf };
        stderrBuf = "";
      }
      yield { type: "exit", exitCode: event.exit.exitCode };
    }
  }
}
