/**
 * @layer test
 * @unit validator-system
 * @story WI-259
 *
 * WI-259 / ADR-030 §Decision.3.④: 実 corpus 統合テスト。
 * 現リポジトリの指示搭載ファイル（SKILL.md ×N / CLAUDE.md / AGENTS.md / agent-context / .claude/settings.json）に
 * 対し L3-006 injection-scan が誤検知 0（finding 0 件）であることを保証する。
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { InjectionPatternScanService } from "../../../validator-system/domain/services/injection-pattern-scan-service.js";
import { FileSystemInjectionScanAdapter } from "../../../validator-system/infrastructure/adapters/file-system-injection-scan-adapter.js";

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(TEST_DIR, "..", "..", "..", "..", "..");

describe("injection-scan 実 corpus 統合（WI-259）", () => {
  it("現 corpus に対し finding 0 件（誤検知 0）であること", async () => {
    // Arrange
    const adapter = new FileSystemInjectionScanAdapter(REPO_ROOT);
    const service = new InjectionPatternScanService();

    // Act
    const targets = await adapter.collect();
    const report = service.scan(targets);

    // Assert: 走査対象が存在すること（corpus が空でない）と、finding が 0 件であること。
    expect(targets.length).toBeGreaterThan(0);
    expect(report.findings).toEqual([]);
    expect(report.hasFindings()).toBe(false);
  });
});
