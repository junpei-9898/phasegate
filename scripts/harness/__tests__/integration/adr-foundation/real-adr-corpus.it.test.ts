// @layer test
// @story H05-02
//
// 実 docs/ADR/ コーパスに対する real-corpus integration test（fully ac-bound）。
//
// コーパス正規化（adr-gate-normalization-followup.md, v0.173.0）と §12 Key Decisions の
// ADR 起票（v0.175.0, ADR 022-029 + 007/008/010）が完了したため、このスライスは H05-02 の
// 全受け入れ基準（AC-1..AC-4）を per-AC binding（`@ac H05-02-N`）で正直に検証する。
//   - AC-1（§12 Key Decisions 全 11 件が docs/ADR/ に ADR として起票済み）
//       → 各 ADR raw markdown の `> §12 Key Decision: <key>` マーカーを収集し、11 canonical
//         key の網羅と、各 key が discoverable かつ schema-valid な ADR に解決することを検証。
//   - AC-2（各 ADR が H05-01 テンプレート構造に準拠）→ validate-all の fail-closed conformance。
//   - AC-3（各 ADR の status ∈ {Accepted, Proposed}）→ status 検証。
//   - AC-4（各 ADR のフロントマターが機械的に解析可能）→ discovery + frontmatter parse。
import { readFileSync, readdirSync } from 'node:fs';
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
// 正規化により legacy 18 件（001..018）も canonical 化され discoverable になったため、
// membership floor には既存の canonical（019/020/021）に加えて正規化済み代表 ID を含める。
// 完全一覧はハードコードしない（ADR-022 追加で壊れないよう membership + floor で検証）。
const EXPECTED_CANONICAL_MEMBERS = ['001', '013', '018', '019', '020', '021'] as const;
const CANONICAL_FLOOR = EXPECTED_CANONICAL_MEMBERS.length;

// harness_product_overview §12 Key Decisions の 11 意思決定 key（canonical）。
// H05-02 AC-1 は「以下の全 11 件が docs/ADR/ に ADR として起票済み」を要求する。
// 各 ADR は body の `## Context` 内に `> §12 Key Decision: <key>` マーカーを 1 行担持する。
const CANONICAL_KEY_DECISIONS = [
  'package-separation',
  'eslint-to-biome',
  'k-requirements-quality-ownership',
  'fuse-out-of-scope',
  'harness-error-fix-example',
  'quick-mode-eligibility',
  'config-file-separation',
  'nyquist-truths-artifacts',
  'artifact-driven-state',
  'validator-stack-detection',
  'four-to-five-layer-path',
] as const;

// `> §12 Key Decision: <key>` マーカー抽出用（ADR raw markdown 1 行に対して）。
const KEY_DECISION_MARKER = /^>\s*§12 Key Decision:\s*(\S+)\s*$/m;

const module = createAdrFoundationModule(adrDir);
const { adrRepository, validateAdrCommandHandler } = module;

target('実 docs/ADR コーパス integration（H05-02, fully ac-bound）', () => {
  context('§12 Key Decisions 全件の ADR 起票（AC-1）', () => {
    // @ac H05-02-1
    it('§12 Key Decisions全11件が起票済みで各keyがdiscoverableかつschema-validなADRに解決する', async () => {
      // Arrange — real corpus に配線済みの repository を用い、disk 上の canonical ADR を列挙する。
      const diskCanonicalFiles = readdirSync(adrDir).filter((entry) =>
        CANONICAL_ADR_PATTERN.test(entry),
      );

      // Act — 各 ADR raw markdown からマーカーを収集し、key → ADR id の対応を構築する。
      const keyToAdrId = new Map<string, string>();
      for (const fileName of diskCanonicalFiles) {
        const raw = readFileSync(join(adrDir, fileName), 'utf8');
        const match = raw.match(KEY_DECISION_MARKER);
        if (match) {
          const adrId = fileName.slice(0, 3);
          keyToAdrId.set(match[1], adrId);
        }
      }

      // discovery + schema 検証（validate-all payload で valid な adrRef を集める）。
      const discovered = await adrRepository.findAll();
      const discoveredIds = new Set(discovered.map((adr) => adr.id.value));
      const validateResult = await validateAdrCommandHandler.execute({ all: true, json: true });
      const payload = JSON.parse(validateResult.text) as {
        results: ReadonlyArray<{ adrRef: string; valid: boolean }>;
      };
      const schemaValidIds = new Set(
        payload.results.filter((r) => r.valid).map((r) => r.adrRef.replace(/^ADR-/, '')),
      );

      // Assert — 11 canonical key が全て収集され、欠落 key を名指しで失敗させる。
      const missingKeys = CANONICAL_KEY_DECISIONS.filter((key) => !keyToAdrId.has(key));
      expect(missingKeys, `§12 Key Decision マーカーが欠落: ${missingKeys.join(', ')}`).toHaveLength(0);

      // 各 key が discoverable かつ schema-valid な ADR に解決する。
      for (const key of CANONICAL_KEY_DECISIONS) {
        const adrId = keyToAdrId.get(key);
        expect(adrId, `key '${key}' が ADR に解決しない`).toBeDefined();
        expect(
          discoveredIds.has(adrId as string),
          `key '${key}' → ADR-${adrId} が discovery されない`,
        ).toBe(true);
        expect(
          schemaValidIds.has(adrId as string),
          `key '${key}' → ADR-${adrId} が schema-valid でない`,
        ).toBe(true);
      }
    });
  });

  context('canonical ADR の discovery', () => {
    // @ac H05-02-4
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
    // @ac H05-02-2
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
    // @ac H05-02-3
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

  context('コーパス正規化完了の invariant', () => {
    it('レガシーADR-接頭辞ファイルはdisk上に残存せず、正規化済み18件がdiscoveryされる', async () => {
      // Arrange — disk 上の実ファイル一覧を直接読む。
      const diskEntries = readdirSync(adrDir);
      const legacyOnDisk = diskEntries.filter((entry) => LEGACY_ADR_PATTERN.test(entry));
      const canonicalOnDisk = diskEntries.filter((entry) => CANONICAL_ADR_PATTERN.test(entry));

      // Act
      const discovered = await adrRepository.findAll();
      const discoveredIds = new Set(discovered.map((adr) => adr.id.value));

      // Assert — legacy 接頭辞ファイルは正規化により disk 上から消滅している。
      expect(legacyOnDisk).toHaveLength(0);
      // discovery 件数は disk 上 canonical 件数と一致する（発見漏れなし）。
      expect(discovered.length).toBe(canonicalOnDisk.length);
      // 正規化前 legacy だった 18 件（001..018）が canonical として discovery される。
      for (let n = 1; n <= 18; n++) {
        const id = String(n).padStart(3, '0');
        expect(discoveredIds.has(id)).toBe(true);
      }
    });
  });
});
