// @layer test
// @story H05-02
//
// 実 docs/ADR/ コーパスに対する real-corpus integration test（honest-partial）。
//
// このファイルには意図的に `@ac H05-02-N` タグを付与していない。
// H05-02 AC-1/2/3 は「§12 Key Decisions 全件が ADR として作成・conform・status 妥当」を
// 要求するが、それらの意思決定の大半は旧 `ADR-NNN-*.md` 形式（非 YAML）で記録されており、
// ADR ゲートの discovery 正規表現 `^[0-9]{3}-[a-z0-9-]+\.md$` に一致しないため
// gate から不可視（= 機械検証できない）。したがってこのスライスでは:
//   - discoverable な canonical コーパス（019/020/021 …）の fail-closed conformance と
//   - legacy ADR-接頭辞ファイルが discovery から確実に除外される invariant
// を SCOPED property として正直に検証するに留める。
// per-AC binding（`@ac`）への昇格は、legacy ADR コーパスが canonical 形式へ正規化された後に
// deferred する（adr-gate-normalization-followup.md）。file-level `@story H05-02` のみを担持し、
// H05-02 AC-1/2/3 は fileFallbackOnly のまま維持する（over-claim を回避）。
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
import { context, target } from '../../helpers/test-helpers.ts';
import { createAdrFoundationModule } from '../../../adr-foundation/composition-root.js';

// リポジトリルートをテストファイル位置から解決する（cwd 非依存 / mkdtemp なし）。
// scripts/harness/__tests__/integration/adr-foundation/ → repo root は 5 階層上。
const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testDir, '..', '..', '..', '..', '..');
const adrDir = join(repoRoot, 'docs', 'ADR');

// discovery 正規表現（canonical: NNN-slug.md）。infra 実装の ADR_FILE_PATTERN と等価。
const CANONICAL_ADR_PATTERN = /^[0-9]{3}-[a-z0-9-]+\.md$/;
// legacy 接頭辞ファイル（ADR-NNN-*.md）。旧非 YAML 形式で gate 不可視。
const LEGACY_ADR_PATTERN = /^ADR-[0-9]{3}-.*\.md$/;

// 実コーパスに存在すべき canonical ADR の floor（membership 検証用）。
// 完全一覧はハードコードしない（ADR-022 追加で壊れないよう membership + floor で検証）。
const EXPECTED_CANONICAL_MEMBERS = ['019', '020', '021'] as const;
const CANONICAL_FLOOR = EXPECTED_CANONICAL_MEMBERS.length;

const module = createAdrFoundationModule(adrDir);
const { adrRepository, validateAdrCommandHandler } = module;

target('実 docs/ADR コーパス integration（H05-02, honest-partial）', () => {
  context('canonical ADR の discovery', () => {
    it('実docs/ADRコーパスからcanonical形式のADRを1件以上発見する', async () => {
      // Arrange — real corpus に配線済みの repository を用いる。

      // Act
      const discovered = await adrRepository.findAll();
      const discoveredIds = discovered.map((adr) => adr.id.value);

      // Assert — 非空 + 期待 canonical ADR が membership に含まれ + floor 件数を満たす。
      expect(discovered.length).toBeGreaterThan(0);
      expect(discovered.length).toBeGreaterThanOrEqual(CANONICAL_FLOOR);
      for (const expectedId of EXPECTED_CANONICAL_MEMBERS) {
        expect(discoveredIds).toContain(expectedId);
      }
    });
  });

  context('discoverable コーパスの conformance', () => {
    it('発見された全ADRがテンプレート構造に準拠する', async () => {
      // Arrange — real corpus を validate-all に通す。

      // Act
      const result = await validateAdrCommandHandler.execute({ all: true, json: true });
      const payload = JSON.parse(result.text) as {
        valid: boolean;
        results: ReadonlyArray<{ adrRef: string; valid: boolean; violations: unknown[] }>;
      };

      // Assert — discoverable な canonical コーパスは fail-closed で全件 conform。
      expect(payload.results.length).toBeGreaterThanOrEqual(CANONICAL_FLOOR);
      expect(payload.valid).toBe(true);
      for (const adrResult of payload.results) {
        expect(adrResult.valid).toBe(true);
        expect(adrResult.violations).toHaveLength(0);
      }
      expect(result.exitCode).toBe(0);
    });
  });

  context('discoverable コーパスの status', () => {
    it('発見された全ADRのstatusがAcceptedまたはProposedである', async () => {
      // Arrange
      const allowed = new Set(['Accepted', 'Proposed']);

      // Act
      const discovered = await adrRepository.findAll();

      // Assert — 各 canonical ADR の status ∈ {Accepted, Proposed}。
      expect(discovered.length).toBeGreaterThanOrEqual(CANONICAL_FLOOR);
      for (const adr of discovered) {
        expect(allowed.has(adr.getStatus().value)).toBe(true);
      }
    });
  });

  context('legacy 接頭辞ファイルの除外 invariant', () => {
    it('レガシーADR-接頭辞ファイルはdisk上に存在するがdiscoveryから除外される', async () => {
      // Arrange — disk 上の実ファイル一覧を直接読む。
      const diskEntries = readdirSync(adrDir);
      const legacyOnDisk = diskEntries.filter((entry) => LEGACY_ADR_PATTERN.test(entry));
      const canonicalOnDisk = diskEntries.filter((entry) => CANONICAL_ADR_PATTERN.test(entry));

      // Act
      const discovered = await adrRepository.findAll();
      const discoveredIds = new Set(discovered.map((adr) => adr.id.value));
      // legacy ファイル名から数値 ID を抽出（例: ADR-001-... → 001）。
      const legacyIds = legacyOnDisk.map((entry) => {
        const match = entry.match(/^ADR-([0-9]{3})-/);
        return match ? match[1] : entry;
      });

      // Assert — legacy は disk 上に >=18 存在するが discovery には一切現れない（既知の限界を invariant として pin）。
      expect(legacyOnDisk.length).toBeGreaterThanOrEqual(18);
      // canonical のみが discovery され、その件数は disk 上 canonical 件数と一致する。
      expect(discovered.length).toBe(canonicalOnDisk.length);
      for (const legacyId of legacyIds) {
        expect(discoveredIds.has(legacyId)).toBe(false);
      }
    });
  });
});
