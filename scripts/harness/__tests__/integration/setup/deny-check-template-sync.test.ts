// @unit harness-api
// @layer test
// @story H13-04
// @work-item-id WI-272

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, it } from "vitest";
import { target } from "../../helpers/test-helpers.js";

const LIVE_HOOK_PATH = join(".claude", "scripts", "deny-check.sh");
const TEMPLATE_HOOK_PATH = join("templates", ".claude", "scripts", "deny-check.sh");

const ALLOWLIST_SECTION_START = "# --- git subcommand allowlist (default-deny)";
const CHECK_SEGMENT_START = "check_segment() {";

/**
 * git allowlist セクション（マーカーコメントから check_segment 直前まで）を抜き出す。
 * GIT_ALLOWED_SUBCOMMANDS / check_symbolic_ref / check_git_config /
 * extract_git_subcommand / check_git_allowlist の全定義を含む。
 */
const extractAllowlistSection = (content: string, label: string): string => {
  const start = content.indexOf(ALLOWLIST_SECTION_START);
  const end = content.indexOf(CHECK_SEGMENT_START);
  if (start < 0 || end < 0 || end <= start) {
    throw new Error(`${label} に git allowlist セクションが見つかりません (start=${start}, end=${end})`);
  }
  return content.slice(start, end);
};

/**
 * check_segment 定義からファイル末尾まで（ガード呼び出し・deny ループ・main ループ）を抜き出す。
 */
const extractEnforcementTail = (content: string, label: string): string => {
  const start = content.indexOf(CHECK_SEGMENT_START);
  if (start < 0) {
    throw new Error(`${label} に check_segment 定義が見つかりません`);
  }
  return content.slice(start);
};

target("deny-check.sh テンプレート同期 (WI-272)", () => {
  it("配布テンプレートが live 版と byte 一致すること（意図的差分なしの現契約）", async () => {
    // Arrange
    // WI-272 時点で両ファイルに意図的差分（プレースホルダ・PJ 名等）は存在しない。
    // 将来 live 版に self-repo 固有の差分を意図して入れる場合は、このテストを
    // セクション比較（下の 2 テスト）のみへ意識的に緩和すること。
    const root = process.cwd();

    // Act
    const actualLive = await readFile(join(root, LIVE_HOOK_PATH), "utf8");
    const actualTemplate = await readFile(join(root, TEMPLATE_HOOK_PATH), "utf8");

    // Assert
    expect(actualTemplate).toBe(actualLive);
  });

  it("配布テンプレートの git allowlist セクションが live 版と一致すること", async () => {
    // Arrange
    const root = process.cwd();
    const live = await readFile(join(root, LIVE_HOOK_PATH), "utf8");
    const template = await readFile(join(root, TEMPLATE_HOOK_PATH), "utf8");

    // Act
    const actualLiveSection = extractAllowlistSection(live, LIVE_HOOK_PATH);
    const actualTemplateSection = extractAllowlistSection(template, TEMPLATE_HOOK_PATH);

    // Assert
    expect(actualTemplateSection).toBe(actualLiveSection);
  });

  it("配布テンプレートの check_segment 以降（ガード呼び出しと deny ループ）が live 版と一致すること", async () => {
    // Arrange
    const root = process.cwd();
    const live = await readFile(join(root, LIVE_HOOK_PATH), "utf8");
    const template = await readFile(join(root, TEMPLATE_HOOK_PATH), "utf8");

    // Act
    const actualLiveTail = extractEnforcementTail(live, LIVE_HOOK_PATH);
    const actualTemplateTail = extractEnforcementTail(template, TEMPLATE_HOOK_PATH);

    // Assert
    expect(actualTemplateTail).toBe(actualLiveTail);
  });

  it("配布テンプレートが read/write 分離ガードを check_segment から呼び出していること", async () => {
    // Arrange
    const root = process.cwd();
    const template = await readFile(join(root, TEMPLATE_HOOK_PATH), "utf8");

    // Act
    const actualTail = extractEnforcementTail(template, TEMPLATE_HOOK_PATH);

    // Assert
    expect(actualTail).toContain('check_symbolic_ref "$segment"');
    expect(actualTail).toContain('check_git_config "$segment"');
    expect(actualTail).toContain('check_git_allowlist "$segment"');
  });
});
