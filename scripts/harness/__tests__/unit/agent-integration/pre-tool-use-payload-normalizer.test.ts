// @unit agent-integration
// @layer presentation
// @story H11-02
// @work-item-id WI-385

import { describe, expect, it } from "vitest";
import { PreToolUsePayloadNormalizer } from "../../../agent-integration/presentation/pre-tool-use-payload-normalizer.js";

describe("PreToolUsePayloadNormalizer", () => {
  it("蛇形式payloadは従来応答とWrite入力へ正規化すること", () => {
    // Arrange
    const normalizer = new PreToolUsePayloadNormalizer();
    const payload = { cwd: "/repo", tool_name: "Write", tool_input: { file_path: "src/a.ts", content: "a" } };

    // Act
    const actual = normalizer.normalize(payload);

    // Assert
    expect(actual).toEqual({
      ok: true,
      request: {
        shape: "FLAT_SNAKE_CASE",
        responseProfile: "LEGACY_EXIT_ONLY",
        cwd: "/repo",
        toolName: "Write",
        toolInput: { file_path: "src/a.ts", content: "a" },
        inputTruncated: false,
      },
    });
  });

  it("駱駝形式payloadは互換応答と検索置換入力へ正規化すること", () => {
    // Arrange
    const normalizer = new PreToolUsePayloadNormalizer();
    const payload = {
      cwd: "/repo",
      toolName: "search_replace",
      toolInput: { file_path: "src/a.ts", old_string: "a", new_string: "b", ignored: true },
      agent: "grok",
      model: "grok-code-fast",
    };

    // Act
    const actual = normalizer.normalize(payload);

    // Assert
    expect(actual).toEqual({
      ok: true,
      request: {
        shape: "FLAT_CAMEL_CASE",
        responseProfile: "COMPATIBILITY_DENY_ENVELOPE",
        cwd: "/repo",
        toolName: "Edit",
        toolInput: { file_path: "src/a.ts", old_string: "a", new_string: "b" },
        inputTruncated: false,
      },
    });
  });

  it("入れ子形式payloadは先頭workspaceとAntigravity書込入力へ正規化すること", () => {
    // Arrange
    const normalizer = new PreToolUsePayloadNormalizer();
    const payload = {
      toolCall: { name: "write_to_file", args: { TargetFile: "src/a.ts", CodeContent: "a" } },
      workspacePaths: ["/repo", "/other"],
      modelName: "unknown-model",
    };

    // Act
    const actual = normalizer.normalize(payload);

    // Assert
    expect(actual).toEqual({
      ok: true,
      request: {
        shape: "NESTED_TOOL_CALL",
        responseProfile: "TOP_LEVEL_DENY_ENVELOPE",
        cwd: "/repo",
        toolName: "Write",
        toolInput: { file_path: "src/a.ts", content: "a" },
        inputTruncated: false,
      },
    });
  });

  it("混在した複数shapeは優先推測せず曖昧エラーにすること", () => {
    // Arrange
    const normalizer = new PreToolUsePayloadNormalizer();
    const payload = {
      tool_name: "Write",
      tool_input: { file_path: "src/a.ts" },
      toolName: "write",
      toolInput: { file_path: "src/b.ts" },
    };

    // Act
    const actual = normalizer.normalize(payload);

    // Assert
    expect(actual).toEqual({ ok: false, reason: expect.stringContaining("複数") });
  });

  it("従来hook印付き蛇形式でtool名だけ欠ける場合は旧拒否理由を維持すること", () => {
    // Arrange
    const normalizer = new PreToolUsePayloadNormalizer();

    // Act
    const actual = normalizer.normalize({ hook_event_name: "PreToolUse", session_id: "s-1" });

    // Assert
    expect(actual).toEqual({
      ok: false,
      responseProfile: "LEGACY_EXIT_ONLY",
      reason: "tool_nameフィールドが必要です",
    });
  });

  it("従来蛇形式の非object入力は空入力へ丸めてfail-open契約を残すこと", () => {
    // Arrange
    const normalizer = new PreToolUsePayloadNormalizer();

    // Act
    const actual = [
      normalizer.normalize({ tool_name: "Read", tool_input: null }),
      normalizer.normalize({ tool_name: "Read", tool_input: "invalid" }),
    ];

    // Assert
    expect(actual).toEqual([
      expect.objectContaining({ ok: true, request: expect.objectContaining({ toolInput: {} }) }),
      expect.objectContaining({ ok: true, request: expect.objectContaining({ toolInput: {} }) }),
    ]);
  });

  it("従来Writeのpaths配列は複数書込対象として保持すること", () => {
    // Arrange
    const normalizer = new PreToolUsePayloadNormalizer();

    // Act
    const actual = normalizer.normalize({
      tool_name: "Write",
      tool_input: { paths: ["a.ts", "b.ts"] },
    });

    // Assert
    expect(actual).toMatchObject({
      ok: true,
      request: { toolName: "Write", toolInput: { paths: ["a.ts", "b.ts"] } },
    });
  });

  it("識別情報だけが異なるcamel入力は同じ正規化結果を返すこと", () => {
    // Arrange
    const normalizer = new PreToolUsePayloadNormalizer();
    const base = { toolName: "write", toolInput: { file_path: "src/a.ts" } };

    // Act
    const actual = [
      normalizer.normalize({ ...base, agent: "grok", modelName: "first" }),
      normalizer.normalize({ ...base, agent: "other", modelName: "second" }),
    ];

    // Assert
    expect(actual[0]).toEqual(actual[1]);
  });

  it("端末commandはBash語彙へ写像し未知keyを捨てること", () => {
    // Arrange
    const normalizer = new PreToolUsePayloadNormalizer();
    const payload = { toolName: "run_terminal_command", toolInput: { command: "echo x > a.txt", extra: 1 } };

    // Act
    const actual = normalizer.normalize(payload);

    // Assert
    expect(actual).toMatchObject({ ok: true, request: { toolName: "Bash", toolInput: { command: "echo x > a.txt" } } });
  });

  it("生patchはapply_patch語彙とcommandへ写像すること", () => {
    // Arrange
    const normalizer = new PreToolUsePayloadNormalizer();
    const patch = "*** Begin Patch\n*** Add File: a.ts\n+x\n*** End Patch";

    // Act
    const actual = normalizer.normalize({ toolName: "apply_patch", toolInput: { patch } });

    // Assert
    expect(actual).toMatchObject({ ok: true, request: { toolName: "apply_patch", toolInput: { command: patch } } });
  });

  it("切詰めcommandは対象完全性を証明できないエラーにすること", () => {
    // Arrange
    const normalizer = new PreToolUsePayloadNormalizer();

    // Act
    const actual = normalizer.normalize({
      toolName: "run_terminal_command",
      toolInput: { command: "echo x > a.txt" },
      toolInputTruncated: true,
    });

    // Assert
    expect(actual).toEqual({
      ok: false,
      responseProfile: "COMPATIBILITY_DENY_ENVELOPE",
      reason: expect.stringContaining("切り詰め"),
    });
  });

  it("完全path付き切詰めdirect入力は検査を継続すること", () => {
    // Arrange
    const normalizer = new PreToolUsePayloadNormalizer();

    // Act
    const actual = normalizer.normalize({
      toolName: "write",
      toolInput: { file_path: "src/a.ts" },
      toolInputTruncated: true,
    });

    // Assert
    expect(actual).toMatchObject({ ok: true, request: { inputTruncated: true, toolInput: { file_path: "src/a.ts" } } });
  });

  it("候補順pathは空文字を除いて最初の有効値を選ぶこと", () => {
    // Arrange
    const normalizer = new PreToolUsePayloadNormalizer();

    // Act
    const actual = normalizer.normalize({
      toolName: "write",
      toolInput: { file_path: "", filePath: "src/selected.ts", path: "src/later.ts" },
    });

    // Assert
    expect(actual).toMatchObject({ ok: true, request: { toolInput: { file_path: "src/selected.ts" } } });
  });

  it("置換候補keyはsnakeとlowerCamelの双方をEditへ写像すること", () => {
    // Arrange
    const normalizer = new PreToolUsePayloadNormalizer();
    const payload = {
      toolCall: {
        name: "replace_file_content",
        args: { target_file: "src/a.ts", oldContent: "a", newContent: "b" },
      },
    };

    // Act
    const actual = normalizer.normalize(payload);

    // Assert
    expect(actual).toMatchObject({
      ok: true,
      request: { toolName: "Edit", toolInput: { file_path: "src/a.ts", old_string: "a", new_string: "b" } },
    });
  });

  it("複数置換toolは単一filePathをEdit対象として保持すること", () => {
    // Arrange
    const normalizer = new PreToolUsePayloadNormalizer();

    // Act
    const actual = normalizer.normalize({
      toolCall: {
        name: "multi_replace_file_content",
        args: { filePath: "src/a.ts", replacements: [{ old: "a", new: "b" }] },
      },
    });

    // Assert
    expect(actual).toMatchObject({ ok: true, request: { toolName: "Edit", toolInput: { file_path: "src/a.ts" } } });
  });

  it("命令候補keyはCommandLineからBash入力を組み立てること", () => {
    // Arrange
    const normalizer = new PreToolUsePayloadNormalizer();

    // Act
    const actual = normalizer.normalize({ toolCall: { name: "run_command", args: { CommandLine: "touch a.txt" } } });

    // Assert
    expect(actual).toMatchObject({ ok: true, request: { toolName: "Bash", toolInput: { command: "touch a.txt" } } });
  });

  it("欠落した対応toolのpathは受理候補付きエラーにすること", () => {
    // Arrange
    const normalizer = new PreToolUsePayloadNormalizer();

    // Act
    const actual = normalizer.normalize({ toolCall: { name: "write_to_file", args: { CodeContent: "x" } } });

    // Assert
    expect(actual).toEqual({
      ok: false,
      responseProfile: "TOP_LEVEL_DENY_ENVELOPE",
      reason: expect.stringContaining("TargetFile"),
    });
  });

  it("空workspacePathsはcwdを未指定にしてprocess側fallbackへ委ねること", () => {
    // Arrange
    const normalizer = new PreToolUsePayloadNormalizer();

    // Act
    const actual = normalizer.normalize({
      toolCall: { name: "write_to_file", args: { path: "src/a.ts" } },
      workspacePaths: [],
    });

    // Assert
    expect(actual).toMatchObject({ ok: true, request: { cwd: undefined } });
  });

  it("toolCall近傍形状でargs名が不明ならnested deny profileを返すこと", () => {
    // Arrange
    const normalizer = new PreToolUsePayloadNormalizer();

    // Act
    const actual = normalizer.normalize({
      toolCall: { tool_name: "write_to_file", arguments: { TargetFile: "biome.json" } },
    });

    // Assert
    expect(actual).toEqual({
      ok: false,
      responseProfile: "TOP_LEVEL_DENY_ENVELOPE",
      reason: expect.stringContaining("toolCall"),
    });
  });
});
