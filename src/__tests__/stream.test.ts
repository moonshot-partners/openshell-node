import { describe, it, expect } from "vitest";
import { streamExecLines } from "../stream.js";
import type { ExecSandboxEvent } from "../generated/openshell.js";
import type { ExecStreamEvent } from "../stream.js";

function makeStdout(text: string): ExecSandboxEvent {
  return { stdout: { data: new TextEncoder().encode(text) } };
}

function makeStderr(text: string): ExecSandboxEvent {
  return { stderr: { data: new TextEncoder().encode(text) } };
}

function makeExit(exitCode: number): ExecSandboxEvent {
  return { exit: { exitCode } };
}

async function* toAsyncIter(events: ExecSandboxEvent[]): AsyncGenerator<ExecSandboxEvent> {
  for (const e of events) yield e;
}

async function collectEvents(stream: AsyncIterable<ExecStreamEvent>): Promise<ExecStreamEvent[]> {
  const result: ExecStreamEvent[] = [];
  for await (const e of stream) result.push(e);
  return result;
}

describe("streamExecLines", () => {
  it("yields complete lines from a single chunk", async () => {
    const events = await collectEvents(
      streamExecLines(toAsyncIter([makeStdout("hello\nworld\n"), makeExit(0)])),
    );

    expect(events).toContainEqual({ type: "stdout", line: "hello" });
    expect(events).toContainEqual({ type: "stdout", line: "world" });
    expect(events).toContainEqual({ type: "exit", exitCode: 0 });
  });

  it("handles partial lines split across chunks", async () => {
    const events = await collectEvents(
      streamExecLines(toAsyncIter([makeStdout("hel"), makeStdout("lo\n"), makeExit(0)])),
    );

    expect(events).toContainEqual({ type: "stdout", line: "hello" });
  });

  it("flushes buffer on exit", async () => {
    const events = await collectEvents(
      streamExecLines(toAsyncIter([makeStdout("no-newline"), makeExit(0)])),
    );

    expect(events).toContainEqual({ type: "stdout", line: "no-newline" });
    expect(events).toContainEqual({ type: "exit", exitCode: 0 });
  });

  it("buffers stderr independently", async () => {
    const events = await collectEvents(
      streamExecLines(toAsyncIter([makeStderr("err-part1"), makeStderr("-part2\n"), makeExit(1)])),
    );

    expect(events).toContainEqual({ type: "stderr", line: "err-part1-part2" });
    expect(events).toContainEqual({ type: "exit", exitCode: 1 });
  });

  it("handles multiple lines in a single chunk", async () => {
    const events = await collectEvents(
      streamExecLines(toAsyncIter([makeStdout("line1\nline2\nline3\n"), makeExit(0)])),
    );

    const stdoutLines = events.filter((e) => e.type === "stdout");
    expect(stdoutLines).toHaveLength(3);
    expect(stdoutLines).toContainEqual({ type: "stdout", line: "line1" });
    expect(stdoutLines).toContainEqual({ type: "stdout", line: "line2" });
    expect(stdoutLines).toContainEqual({ type: "stdout", line: "line3" });
  });

  it("skips empty lines", async () => {
    const events = await collectEvents(
      streamExecLines(toAsyncIter([makeStdout("\n\nhello\n\n"), makeExit(0)])),
    );

    const stdoutLines = events.filter((e) => e.type === "stdout");
    expect(stdoutLines).toHaveLength(1);
    expect(stdoutLines[0]).toEqual({ type: "stdout", line: "hello" });
  });

  it("propagates exit code", async () => {
    const events = await collectEvents(
      streamExecLines(toAsyncIter([makeStderr("error\n"), makeExit(137)])),
    );

    expect(events).toContainEqual({ type: "exit", exitCode: 137 });
  });

  it("flushes both stdout and stderr buffers on exit", async () => {
    const events = await collectEvents(
      streamExecLines(
        toAsyncIter([makeStdout("out-partial"), makeStderr("err-partial"), makeExit(0)]),
      ),
    );

    expect(events).toContainEqual({ type: "stdout", line: "out-partial" });
    expect(events).toContainEqual({ type: "stderr", line: "err-partial" });
    expect(events).toContainEqual({ type: "exit", exitCode: 0 });
  });

  it("handles interleaved stdout and stderr", async () => {
    const events = await collectEvents(
      streamExecLines(
        toAsyncIter([
          makeStdout("out1\n"),
          makeStderr("err1\n"),
          makeStdout("out2\n"),
          makeExit(0),
        ]),
      ),
    );

    expect(events[0]).toEqual({ type: "stdout", line: "out1" });
    expect(events[1]).toEqual({ type: "stderr", line: "err1" });
    expect(events[2]).toEqual({ type: "stdout", line: "out2" });
    expect(events[3]).toEqual({ type: "exit", exitCode: 0 });
  });
});
