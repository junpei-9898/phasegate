# ITテストロジック設計計画: phase-dependency-model

> **作成日**: 2026-04-05
> **対応ストーリー**: H02-01, H02-02, H02-03 + 設定可能フェーズゲート Phase A-4
> **対応テストケース設計**: `docs/inception/phase-dependency-model/it_test_design_plan.md`
> **参照論理設計**: `docs/inception/phase-dependency-model/logical_design_plan.md`
> **参照拡張計画**: `docs/inception/_shared/configurable_phase_gate_plan.md` §4 / §5 / A-4

---

## QA（設計判断の根拠）

### Q1: テストロジックのコード化レベル
- **Q**: ロジック計画を擬似コードで書くか、実コードに近い形で書くか？
- **A**: **擬似コード（Vitest 風）**。実装時に細部を調整できる粒度で記述する。
- **根拠**: ロジック設計は実装方針の合意であり、実装の完全な事前記述ではない。

### Q2: Adapter テストのファイルシステム扱い
- **Q**: `HarnessConfigPhaseConfigProvider` / `MarkdownPlanDocumentReader` / `FileSystemArtifactExistenceChecker` / `PhaseOverrideAuditLogger` / `FileSystemStoryReflectionAdapter` の I/O をどう扱うか？
- **A**: **実ファイルシステムを使用**。`fs.mkdtempSync(path.join(os.tmpdir(), 'phase-dep-it-'))` で一時ディレクトリを生成し、`afterEach` / `afterAll` で `fs.rmSync(..., { recursive: true, force: true })`。
- **根拠**: テスト間の独立性とゴミ残留防止。Unit の主要な外部依存は FS のみで、モック化すると契約検証の価値が失われる。

### Q3: Application 層テストの Port 扱い
- **Q**: UseCase テストで Port を Fake/Stub 化するか、Adapter 実体を使うか？
- **A**: **Port は軽量 Fake / `vi.fn()` を使用**。Domain（`PhaseStructure` 等）は実体を使用。
- **根拠**: Application 層の責務（ポート呼び出し順序、DTO 変換、監査分離）を FS I/O と切り離して純粋に検証するため。`docs/principles/testing-rules.md` の「ドメイン層のモック禁止」と整合。

### Q4: storyReflection（A-4）関連テストの位置付け
- **Q**: A-4 で新設する `HarnessConfigPhaseConfigProvider` 拡張と `FileSystemStoryReflectionAdapter` を既存 IT スコープに含めるか？
- **A**: **本 Unit の IT スコープに含める**。`HarnessConfigPhaseConfigProvider` は既存ファイルの拡張、`FileSystemStoryReflectionAdapter` は `phase-dependency-model/infrastructure/filesystem/` 配下に新設されるため本 Unit の責務。
- **根拠**: `configurable_phase_gate_plan.md` A-4-1/A-4-3 と A-7-5/A-7-7 の IT テスト項目が本 Unit に帰属する。

### Q5: プリセット切替 E2E の配置
- **Q**: `minimal → standard → full` の切替テストを UseCase テスト内に置くか、独立ファイルに置くか？
- **A**: **独立ファイル `preset-switching-integration.test.ts` に配置**。
- **根拠**: 複数 UseCase（`BuildPhaseDependencyGraphUseCase` + `ValidateCustomizationPolicyUseCase` + `CheckPhaseGateUseCase`）を跨ぐため、単一 UseCase テスト粒度とは異なる。

---

## 1. スコープ

- 対象テストケース設計: `docs/inception/phase-dependency-model/it_test_design_plan.md`
- 参照論理設計: `docs/inception/phase-dependency-model/logical_design_plan.md`
- 拡張スコープ: `docs/inception/_shared/configurable_phase_gate_plan.md` A-4 / A-7（storyReflection、プリセット拡充）
- テストケース総数: 約 86 件
  - Application UseCase: 29 件（CheckPhaseGate×10, BuildPhaseDependencyGraph×6, GetPhaseInfo×8, ValidateCustomizationPolicy×5, RecordPhaseOverrideAudit×4 の範囲 + α）
  - Application サービス: UseCase テスト内に統合（EvidenceBundleAssembler / PhaseInfoResolver / PhaseGateResultMapper）
  - Infrastructure Adapter: 31 件（FileSystemArtifactExistenceChecker×5, MarkdownPlanDocumentReader×8, HarnessConfigPhaseConfigProvider×10, PhaseOverrideAuditLogger×3, FileSystemStoryReflectionAdapter×5）
  - Presentation Handler/Facade/Presenter: 21 件（CheckPhaseCommandHandler×5, CheckReadyCommandHandler×5, PhaseGateValidatorFacade×4, PhaseInfoPresenter×3, PhaseGateResultPresenter×3 + hook 経由の storyReflection 統合は `agent-integration` Unit 側で検証）
  - クロス UseCase 統合: 5 件（preset-switching-integration）

---

## 2. テストファイル構成（計画）

| テストファイル | 対象コンポーネント | ケース数 |
|---|---|---:|
| `scripts/harness/__tests__/integration/phase-dependency-model/check-phase-gate-usecase.test.ts` | CheckPhaseGateUseCase + EvidenceBundleAssembler + PhaseGateResultMapper | 10 |
| `scripts/harness/__tests__/integration/phase-dependency-model/build-phase-dependency-graph-usecase.test.ts` | BuildPhaseDependencyGraphUseCase | 6 |
| `scripts/harness/__tests__/integration/phase-dependency-model/get-phase-info-usecase.test.ts` | GetPhaseInfoUseCase + PhaseInfoResolver | 8 |
| `scripts/harness/__tests__/integration/phase-dependency-model/validate-customization-policy-usecase.test.ts` | ValidateCustomizationPolicyUseCase | 5 |
| `scripts/harness/__tests__/integration/phase-dependency-model/record-phase-override-audit-usecase.test.ts` | RecordPhaseOverrideAuditUseCase | 4 |
| `scripts/harness/__tests__/integration/phase-dependency-model/file-system-artifact-existence-checker.test.ts` | FileSystemArtifactExistenceChecker | 5 |
| `scripts/harness/__tests__/integration/phase-dependency-model/markdown-plan-document-reader.test.ts` | MarkdownPlanDocumentReader | 8 |
| `scripts/harness/__tests__/integration/phase-dependency-model/harness-config-phase-config-provider.test.ts` | HarnessConfigPhaseConfigProvider（A-4-1 拡張含む） | 10 |
| `scripts/harness/__tests__/integration/phase-dependency-model/phase-override-audit-logger.test.ts` | PhaseOverrideAuditLogger | 3 |
| `scripts/harness/__tests__/integration/phase-dependency-model/file-system-story-reflection-adapter.test.ts` | FileSystemStoryReflectionAdapter（A-4-3 新設） | 5 |
| `scripts/harness/__tests__/integration/phase-dependency-model/check-phase-command-handler.test.ts` | CheckPhaseCommandHandler + PhaseInfoPresenter | 5 |
| `scripts/harness/__tests__/integration/phase-dependency-model/check-ready-command-handler.test.ts` | CheckReadyCommandHandler + PhaseGateResultPresenter | 5 |
| `scripts/harness/__tests__/integration/phase-dependency-model/phase-gate-validator-facade.test.ts` | PhaseGateValidatorFacade | 4 |
| `scripts/harness/__tests__/integration/phase-dependency-model/preset-switching-integration.test.ts` | プリセット切替 E2E（minimal/standard/full） | 5 |

---

## 3. モック・フィクスチャ設計方針

### Application UseCase テスト

- Port は軽量 Fake / `vi.fn()` を使用する
- Domain 実体（`PhaseStructure.createDefault(policy)`, `PlanningMode.fromConfig(...)`, `PhaseNode`, `PhaseGateResult`）は実体を使用
- `EvidenceBundleAssembler` / `PhaseInfoResolver` / `PhaseGateResultMapper` は実体を生成して UseCase に注入する

```typescript
const fakeArtifactChecker = {
  checkAll: vi.fn<(artifacts: Artifact[]) => Promise<Map<string, boolean>>>(),
};
const fakePlanReader = {
  readEvidence: vi.fn<(node: PhaseNode, mode: PlanningMode) => Promise<PlanEvidence>>(),
};
const fakeConfigProvider = {
  getPlanningMode: vi.fn(),
  getCustomizationPolicy: vi.fn(),
  getReportingOutputDir: vi.fn(),
};
const fakeAuditLogger = { record: vi.fn() };
```

### Infrastructure Adapter テスト

- **実ファイルシステムを使用**（`fs.mkdtempSync(path.join(os.tmpdir(), 'phase-dep-it-<adapter>-'))`）
- `afterEach` で `fs.rmSync(tmpDir, { recursive: true, force: true })`
- `HarnessConfigPhaseConfigProvider`: `phasegate.config.json` を一時ディレクトリに書き出し、`loadConfig(tmpDir)` 経由で読み込ませる
- `MarkdownPlanDocumentReader`: QA セクション有/無/壊れたフォーマット等の `*_plan.md` 固定フィクスチャを `__tests__/integration/phase-dependency-model/fixtures/plan-docs/` に配置し、各ケースで一時ディレクトリへコピー
- `FileSystemArtifactExistenceChecker`: 一時ディレクトリ内にテスト対象ファイルを `touch` 相当で生成
- `PhaseOverrideAuditLogger`: 一時 `.jsonl` ファイルへ追記し、`fs.readFileSync` でパースして検証
- `FileSystemStoryReflectionAdapter`: 一時ディレクトリに `inception/{unit}/US-XXX/` ツリーと `product/{unit}/` ドキュメントを再現

### Presentation Handler/Facade テスト

- UseCase を Stub 化（`vi.fn()`）し、`handler.execute(argv)` の出力（stdout、exit code、JSON 構造）と引数パースを検証
- `PhaseInfoPresenter` / `PhaseGateResultPresenter` は実体を注入し、出力整形を合わせて検証
- `CheckPhaseCommandHandler` / `CheckReadyCommandHandler` は `process.exit` を呼ばず `CommandResult { exitCode, stdout, stderr }` を返す設計前提（論理設計 §3.4 参照）

### preset-switching-integration

- 一時ディレクトリに 3 種の `phasegate.config.json`（`preset: minimal/standard/full`）を順次配置
- 各プリセットで `HarnessConfigPhaseConfigProvider` → `ValidateCustomizationPolicyUseCase` → `BuildPhaseDependencyGraphUseCase` → `CheckPhaseGateUseCase` を通し、ノード集合・依存グラフ・storyReflection mappings の差分を検証

### フィクスチャ配置

```
scripts/harness/__tests__/integration/phase-dependency-model/fixtures/
├── configs/
│   ├── phasegate.config.full.json
│   ├── phasegate.config.standard.json
│   ├── phasegate.config.minimal.json
│   ├── phasegate.config.custom-rules.json
│   ├── phasegate.config.non-relaxable-override.json   # 緩和不可違反
│   ├── phasegate.config.cyclic-custom-rule.json       # DAG 破壊
│   └── phasegate.config.story-reflection-custom.json  # mappings 明示指定
├── plan-docs/
│   ├── plan-with-qa-answered.md
│   ├── plan-with-qa-unanswered.md
│   ├── plan-without-qa.md
│   ├── plan-interactive-mode.md
│   ├── plan-embedded-qa-mode.md
│   └── plan-broken-headings.md
├── artifacts/
│   ├── existing-artifact.md
│   └── (テストごとに動的生成)
└── story-reflection/
    ├── inception/agent-integration/US-001/logical_design_plan.md
    └── product/agent-integration/logical_design.md     # @story-id: US-001 有り/無しの2版
```

---

## 4. テストヘルパー設計

### インポートパス

- `scripts/harness/__tests__/integration/phase-dependency-model/*.test.ts` → `../../helpers/test-helpers`（2 段階）

### 共通ユーティリティ（新設）

```typescript
// scripts/harness/__tests__/integration/phase-dependency-model/helpers/fs-fixture-helpers.ts

export function createTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `phase-dep-it-${prefix}-`));
}

export function cleanupTempDir(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

export function writeConfigFile(tmpDir: string, config: unknown): string {
  const configPath = path.join(tmpDir, 'phasegate.config.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  return configPath;
}

export function copyFixture(source: string, destDir: string, destName?: string): string {
  const dest = path.join(destDir, destName ?? path.basename(source));
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(source, dest);
  return dest;
}

export function seedArtifacts(tmpDir: string, relativePaths: string[]): void {
  for (const rel of relativePaths) {
    const abs = path.join(tmpDir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, '# stub');
  }
}
```

### Fake Port ファクトリ

```typescript
// scripts/harness/__tests__/integration/phase-dependency-model/helpers/fake-ports.ts

export function createFakeArtifactChecker(initial: Record<string, boolean> = {}) {
  const store = new Map(Object.entries(initial));
  return {
    checkAll: vi.fn(async (artifacts: Artifact[]) => {
      const result = new Map<string, boolean>();
      for (const a of artifacts) result.set(a.path, store.get(a.path) ?? false);
      return result;
    }),
    __setExists: (path: string, exists: boolean) => store.set(path, exists),
  };
}

export function createFakePlanReader(defaults?: Partial<PlanEvidence>) { /* ... */ }
export function createFakeConfigProvider(overrides?: Partial<PhaseCustomizationPolicy>) { /* ... */ }
export function createFakeAuditLogger() {
  const records: PhaseOverrideAuditPayload[] = [];
  return { record: vi.fn(async (p) => { records.push(p); }), __records: records };
}
```

---

## 5. テストロジック詳細（Vitest 擬似コード）

### 5.1 CheckPhaseGateUseCase（10 件）

```typescript
// check-phase-gate-usecase.test.ts

target('execute', () => {
  let fakeChecker, fakeReader, fakeConfig, fakeAudit, usecase;

  beforeEach(() => {
    fakeChecker = createFakeArtifactChecker();
    fakeReader = createFakePlanReader();
    fakeConfig = createFakeConfigProvider();
    fakeAudit = createFakeAuditLogger();
    const assembler = new EvidenceBundleAssembler(fakeChecker, fakeReader, fakeConfig);
    const mapper = new PhaseGateResultMapper();
    usecase = new CheckPhaseGateUseCase(fakeConfig, assembler, mapper, fakeAudit);
  });

  describe('target level へ進めるかを判定する', () => {
    context('Level 2 へ進むための全前提成果物が存在しPlanEvidence 充足の場合', () => {
      it('passed=true の PhaseGateResultDto を返す', async () => {
        // Arrange
        fakeChecker.__setExists('docs/inception/agent-integration/domain_model_plan.md', true);
        // ... L2 前提成果物を全て true に
        fakeReader.readEvidence.mockResolvedValue(
          new PlanEvidence({ exists: true, qaAnswered: true, planningModeMatch: true }),
        );
        fakeConfig.getPlanningMode.mockResolvedValue(PlanningMode.fromConfig('interactive'));
        fakeConfig.getCustomizationPolicy.mockResolvedValue(PhaseCustomizationPolicy.default());

        // Act
        const actual = await usecase.execute({ targetLevel: 2, unit: 'agent-integration' });

        // Assert
        expect(actual.passed).toBe(true);
        expect(actual.blockers).toEqual([]);
        expect(fakeAudit.record).not.toHaveBeenCalled();
      });
    });

    context('override=true のカスタムルールが適用された場合', () => {
      it('passed=true かつ auditLogger.record が呼ばれ auditPayload が含まれる', async () => {
        // Arrange: override を含む CustomizationPolicy を設定
        // Act
        // Assert: fakeAudit.__records[0].appliedRules, generatedAt (ISO8601) を検証
      });

      it('override 適用がない通常通過時は record が呼ばれない', async () => { /* ... */ });
    });

    context('前提成果物が欠損している場合', () => {
      it('passed=false で blockers に欠損成果物名が含まれる', async () => { /* ... */ });
      it('required=false の成果物欠損は blockers に含まれない', async () => { /* ... */ });
    });

    context('PlanEvidence が不足している場合', () => {
      it('plan 文書不存在で passed=false', async () => {
        fakeReader.readEvidence.mockResolvedValue(
          new PlanEvidence({ exists: false, qaAnswered: false, planningModeMatch: false }),
        );
        const actual = await usecase.execute({ targetLevel: 2, unit: 'agent-integration' });
        expect(actual.passed).toBe(false);
        expect(actual.blockers.some((b) => b.code === 'PLAN_DOCUMENT_MISSING')).toBe(true);
      });

      it('interactive 指定で QA 未回答の場合 passed=false', async () => { /* ... */ });
    });

    context('ドメインエラーが発生した場合', () => {
      it('CyclicPhaseDependencyError を上位へ送出する', async () => { /* ... */ });
      it('NonRelaxableDependencyOverrideError を上位へ送出する', async () => { /* ... */ });
    });
  });
});
```

### 5.2 BuildPhaseDependencyGraphUseCase（6 件）

```typescript
target('execute', () => {
  describe('フェーズ構造 DAG を DTO として返す', () => {
    context('デフォルトポリシーの場合', () => {
      it('全 Level・全ノード・全依存を含むグラフを返す', async () => {
        // Arrange
        fakeConfig.getCustomizationPolicy.mockResolvedValue(PhaseCustomizationPolicy.default());
        const usecase = new BuildPhaseDependencyGraphUseCase(fakeConfig);
        // Act
        const actual = await usecase.execute({ includeArtifacts: false });
        // Assert
        expect(actual.nodes).toHaveLength(/* default node count */);
        expect(actual.nodes[0].artifacts).toBeUndefined();
      });
    });

    context('includeArtifacts=true の場合', () => {
      it('各 NodeDTO に artifacts[] が含まれる', async () => { /* ... */ });
    });

    context('includeArtifacts 未指定の場合', () => {
      it('artifacts が省略される', async () => { /* ... */ });
    });

    context('customRules 適用後', () => {
      it('有効な追加依存がグラフに反映される', async () => { /* ... */ });
      it('NonRelaxableDependencyOverrideError を送出する', async () => { /* ... */ });
      it('CyclicPhaseDependencyError を送出する', async () => { /* ... */ });
    });
  });
});
```

### 5.3 GetPhaseInfoUseCase（8 件）

```typescript
target('execute', () => {
  describe('現在のフェーズ進捗を算出する', () => {
    context('L1 完了・L2 途中の場合', () => {
      it('currentLevel=2, completedNodes, nextNodes が正しく算出される', async () => {
        // Arrange: L1 artifacts 全 true、L2 artifacts 一部 true、PlanEvidence を設定
        // Act: usecase.execute({ unit: 'x', storyId: undefined })
        // Assert: dto.currentLevel, dto.completedNodes[], dto.nextNodes[] を検証
      });
      it('completedNodes が空の場合も dto を返す', async () => { /* ... */ });
      it('L3 ノードまで全完了時 currentLevel=3 で nextNodes=[]', async () => { /* ... */ });
    });
    context('storyId 指定時', () => {
      it('L3 ノードが storyId スコープで絞り込まれる', async () => { /* ... */ });
      it('storyId 未存在時は空の nextNodes を返す', async () => { /* ... */ });
    });
    context('config 取得失敗時', () => {
      it('PhaseConfigLoadError を送出する', async () => { /* ... */ });
    });
    context('plan 文書解析失敗時', () => {
      it('PlanDocumentReadError を上位へ伝播する', async () => { /* ... */ });
    });
    context('interactive モード時の PlanEvidence 解釈', () => {
      it('planningModeMatch=false でも currentLevel は進捗計算される', async () => { /* ... */ });
    });
  });
});
```

### 5.4 ValidateCustomizationPolicyUseCase（5 件）

```typescript
target('execute', () => {
  describe('カスタマイズポリシーを検証する', () => {
    it('valid=true を返す（正常系）', async () => { /* ... */ });
    it('InvalidCustomRuleError を errors に変換して valid=false', async () => { /* ... */ });
    it('NonRelaxableDependencyOverrideError を errors に変換', async () => { /* ... */ });
    it('CyclicPhaseDependencyError を errors に変換', async () => { /* ... */ });
    it('warnings 付き valid=true を返す', async () => { /* ... */ });
  });
});
```

### 5.5 RecordPhaseOverrideAuditUseCase（4 件）

```typescript
target('execute', () => {
  describe('override 監査を記録する', () => {
    it('正しい payload で auditLogger.record が呼ばれる', async () => {
      // Arrange
      const payload = { appliedRules: [{ from: 'A', to: 'B', reason: 'R' }], unit: 'x', storyId: 'US-001' };
      // Act
      await usecase.execute(payload);
      // Assert: record の引数に generatedAt (ISO8601 正規表現) が含まれる
      const actual = fakeAudit.__records[0];
      expect(actual.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/);
      expect(actual.appliedRules).toEqual(payload.appliedRules);
    });
    it('appliedRules が空配列でも record が呼ばれる', async () => { /* ... */ });
    it('auditLogger 失敗時 AuditLogWriteError を送出する', async () => { /* ... */ });
    it('generatedAt が UTC で生成される', async () => { /* ... */ });
  });
});
```

### 5.6 FileSystemArtifactExistenceChecker（5 件）

```typescript
target('checkAll', () => {
  let tmpDir: string;
  beforeEach(() => { tmpDir = createTempDir('artifact-checker'); });
  afterEach(() => { cleanupTempDir(tmpDir); });

  describe('成果物の存在を判定する', () => {
    it('存在するファイルは true、存在しないファイルは false の Map を返す', async () => {
      // Arrange
      seedArtifacts(tmpDir, ['docs/a.md']);
      const checker = new FileSystemArtifactExistenceChecker(tmpDir);
      const artifacts: Artifact[] = [
        { name: 'a', path: 'docs/a.md', required: true },
        { name: 'b', path: 'docs/b.md', required: true },
      ];
      // Act
      const actual = await checker.checkAll(artifacts);
      // Assert
      expect(actual.get('docs/a.md')).toBe(true);
      expect(actual.get('docs/b.md')).toBe(false);
    });

    it('{storyId} プレースホルダが解決されてから存在判定される', async () => {
      seedArtifacts(tmpDir, ['docs/inception/u/US-001/plan.md']);
      const checker = new FileSystemArtifactExistenceChecker(tmpDir, { storyId: 'US-001', unit: 'u' });
      const actual = await checker.checkAll([
        { name: 'plan', path: 'docs/inception/{unit}/{storyId}/plan.md', required: true },
      ]);
      expect([...actual.values()][0]).toBe(true);
    });

    it('storyId 未指定で {storyId} を含む必須成果物は false', async () => { /* ... */ });
    it('required=false の成果物も Map に含まれる', async () => { /* ... */ });
    it('project-relative でない絶対パスを与えても正しく判定される', async () => { /* ... */ });
  });
});
```

### 5.7 MarkdownPlanDocumentReader（8 件）

```typescript
target('readEvidence', () => {
  let tmpDir: string;
  beforeEach(() => { tmpDir = createTempDir('plan-reader'); });
  afterEach(() => { cleanupTempDir(tmpDir); });

  const FIXTURE_DIR = path.resolve(__dirname, 'fixtures/plan-docs');

  describe('plan 文書から PlanEvidence を抽出する', () => {
    it('QA 節あり + 全回答済みで exists=true, qaAnswered=true', async () => {
      // Arrange
      copyFixture(path.join(FIXTURE_DIR, 'plan-with-qa-answered.md'), tmpDir, 'unit_design_plan.md');
      const reader = new MarkdownPlanDocumentReader(tmpDir);
      const node = createPhaseNode('unit-designer', 1, [{ name: 'unit_design_plan', path: 'unit_design_plan.md', required: true }]);
      // Act
      const actual = await reader.readEvidence(node, PlanningMode.fromConfig('interactive'));
      // Assert
      expect(actual.exists).toBe(true);
      expect(actual.qaAnswered).toBe(true);
      expect(actual.planningModeMatch).toBe(true);
    });

    it('QA 節あり + 未回答ありで qaAnswered=false', async () => { /* ... */ });
    it('QA 節なし + interactive モードで qaAnswered=false', async () => { /* ... */ });
    it('QA 節なし + embedded-qa モードで qaAnswered=true（QA 不要）', async () => { /* ... */ });
    it('plan 文書不存在で PlanEvidence(false,false,false) を返す', async () => { /* ... */ });
    it('interactive モードで "## QA（設計判断の根拠）" 見出し形式を検出する', async () => { /* ... */ });
    it('embedded-qa モードで planningModeMatch=true', async () => { /* ... */ });
    it('見出しが壊れたフォーマットでもフォールバック判定で exists=true を返す', async () => { /* ... */ });
  });
});
```

### 5.8 HarnessConfigPhaseConfigProvider（10 件、A-4-1 拡張含む）

```typescript
target('HarnessConfigPhaseConfigProvider', () => {
  let tmpDir: string;
  beforeEach(() => { tmpDir = createTempDir('config-provider'); });
  afterEach(() => { cleanupTempDir(tmpDir); });

  describe('getPlanningMode', () => {
    it('default PlanningMode を interactive として取得する', async () => {
      writeConfigFile(tmpDir, { planningMode: { default: 'interactive' }, phaseDependencies: { preset: 'standard' } });
      const provider = new HarnessConfigPhaseConfigProvider(tmpDir);
      const actual = await provider.getPlanningMode({ scope: 'default' });
      expect(actual.value).toBe('interactive');
    });
    it('perPhase で embedded-qa 指定時に該当 scope で embedded-qa を返す', async () => { /* ... */ });
  });

  describe('getCustomizationPolicy', () => {
    it('customRules を PhaseCustomizationPolicy.customRules に正規化する', async () => { /* ... */ });
    it('preset=standard + override を PhaseCustomizationPolicy に変換する', async () => { /* ... */ });
    it('preset=minimal の場合、対応するノードセットでポリシーを構築する', async () => { /* ... */ });
    it('preset=full の場合、既定 customRules を保持する', async () => { /* ... */ });
    it('relaxedGates は Level 間依存緩和として解釈されない', async () => { /* ... */ });
  });

  describe('getReportingOutputDir', () => {
    it('reportingOutputDir を設定値どおり返す', async () => { /* ... */ });
  });

  // --- A-4-1 拡張分 ---
  describe('getStoryReflectionConfig', () => {
    context('phaseDependencies.storyReflection 省略時', () => {
      it('プリセット（full）の既定 mappings を返す', async () => {
        // Arrange: phasegate.config.json に storyReflection セクションを含めない
        writeConfigFile(tmpDir, { phaseDependencies: { preset: 'full' } });
        const provider = new HarnessConfigPhaseConfigProvider(tmpDir);
        // Act
        const actual = await provider.getStoryReflectionConfig();
        // Assert
        expect(actual.enabled).toBe(true);
        expect(actual.mappings.length).toBeGreaterThan(0);
        expect(actual.mappings[0]).toMatchObject({ source: expect.any(String), target: expect.any(String), required: expect.any(Boolean) });
      });
      it('プリセット（minimal）では enabled=false を返す', async () => { /* ... */ });
    });
    context('phaseDependencies.storyReflection.mappings 明示指定時', () => {
      it('設定ファイルの mappings がプリセット既定を上書きする', async () => { /* ... */ });
    });
  });
});
```

### 5.9 PhaseOverrideAuditLogger（3 件）

```typescript
target('record', () => {
  let tmpDir: string;
  beforeEach(() => { tmpDir = createTempDir('audit-logger'); });
  afterEach(() => { cleanupTempDir(tmpDir); });

  describe('override 監査を JSONL に追記する', () => {
    it('初回 record で 1 行の JSONL が書き込まれる', async () => {
      const outPath = path.join(tmpDir, 'phase-override-audit.jsonl');
      const logger = new PhaseOverrideAuditLogger(outPath);
      await logger.record({ unit: 'x', storyId: 'US-001', appliedRules: [], generatedAt: '2026-04-05T00:00:00Z' });
      const actual = fs.readFileSync(outPath, 'utf8').trim().split('\n');
      expect(actual).toHaveLength(1);
      expect(JSON.parse(actual[0]).unit).toBe('x');
    });
    it('複数回 record で追記される', async () => { /* ... */ });
    it('書込不可ディレクトリ指定時に例外を送出する', async () => { /* ... */ });
  });
});
```

### 5.10 FileSystemStoryReflectionAdapter（5 件、A-4-3 新設）

```typescript
target('FileSystemStoryReflectionAdapter', () => {
  let tmpDir: string;
  beforeEach(() => { tmpDir = createTempDir('story-reflection'); });
  afterEach(() => { cleanupTempDir(tmpDir); });

  describe('inception ディレクトリ列挙と product 反映判定', () => {
    it('inception/{unit}/US-XXX/ を列挙して storyId 一覧を返す', async () => {
      // Arrange
      fs.mkdirSync(path.join(tmpDir, 'docs/inception/agent-integration/US-001'), { recursive: true });
      fs.mkdirSync(path.join(tmpDir, 'docs/inception/agent-integration/US-002'), { recursive: true });
      const adapter = new FileSystemStoryReflectionAdapter(tmpDir);
      // Act
      const actual = await adapter.listStoryIds('agent-integration');
      // Assert
      expect(actual).toEqual(expect.arrayContaining(['US-001', 'US-002']));
    });

    it('product 文書内に @story-id: US-001 があれば反映済みと判定する', async () => {
      // Arrange
      fs.mkdirSync(path.join(tmpDir, 'docs/product/agent-integration'), { recursive: true });
      fs.writeFileSync(
        path.join(tmpDir, 'docs/product/agent-integration/logical_design.md'),
        '// @story-id: US-001\n本文',
      );
      const adapter = new FileSystemStoryReflectionAdapter(tmpDir);
      // Act
      const actual = await adapter.isStoryReflected({
        storyId: 'US-001',
        targetPath: 'docs/product/agent-integration/logical_design.md',
      });
      // Assert
      expect(actual).toBe(true);
    });

    it('@story-id が無い product 文書は未反映と判定する', async () => { /* ... */ });
    it('ISSUE-XXX パターンも storyId として列挙される', async () => { /* ... */ });
    it('product 文書不存在時は required=true で false、required=false で true を返す', async () => { /* ... */ });
  });
});
```

### 5.11 CheckPhaseCommandHandler（5 件）

```typescript
target('execute', () => {
  const stubGetPhaseInfoUseCase = { execute: vi.fn() };
  const presenter = new PhaseInfoPresenter();
  const handler = new CheckPhaseCommandHandler(stubGetPhaseInfoUseCase, presenter);

  describe('phasegate check-phase コマンド', () => {
    it('正常系: テキスト出力で exit code 0', async () => {
      stubGetPhaseInfoUseCase.execute.mockResolvedValue(createPhaseInfoDto());
      const actual = await handler.execute(['--unit', 'agent-integration']);
      expect(actual.exitCode).toBe(0);
      expect(actual.stdout).toContain('currentLevel');
    });
    it('--json 指定で JSON 出力', async () => { /* ... */ });
    it('--story 指定で storyId が UseCase に渡される', async () => { /* ... */ });
    it('Unit 未検出時 exit code 1', async () => { /* ... */ });
    it('設定取得失敗時 exit code 2', async () => { /* ... */ });
  });
});
```

### 5.12 CheckReadyCommandHandler（5 件）

```typescript
target('execute', () => {
  describe('phasegate check-ready コマンド', () => {
    it('全 scope ready で exit code 0', async () => { /* ... */ });
    it('1 件でも未充足で exit code 1', async () => { /* ... */ });
    it('--json 指定で JSON 出力', async () => { /* ... */ });
    it('--unit/--story 指定で絞り込みが反映される', async () => { /* ... */ });
    it('設定取得失敗時 exit code 2', async () => { /* ... */ });
  });
});
```

### 5.13 PhaseGateValidatorFacade（4 件）

```typescript
target('validate', () => {
  describe('validator-system 向け Facade', () => {
    it('gate 通過時に空の HarnessError[] を返す', async () => { /* ... */ });
    it('gate 失敗時に HarnessError[] を返す', async () => { /* ... */ });
    it('storyId 指定時に Level 3 を target に決定する', async () => { /* ... */ });
    it('storyId 未指定時に Level 2 を target に決定する', async () => { /* ... */ });
  });
});
```

### 5.14 preset-switching-integration（5 件、A-7-7）

```typescript
target('preset 切替', () => {
  let tmpDir: string;
  beforeEach(() => { tmpDir = createTempDir('preset-switch'); });
  afterEach(() => { cleanupTempDir(tmpDir); });

  describe('minimal → standard → full の切替で UseCase 出力が整合する', () => {
    it('minimal プリセットで BuildPhaseDependencyGraphUseCase が最小ノード集合を返す', async () => {
      // Arrange
      copyFixture(
        path.resolve(__dirname, 'fixtures/configs/phasegate.config.minimal.json'),
        tmpDir,
        'phasegate.config.json',
      );
      const provider = new HarnessConfigPhaseConfigProvider(tmpDir);
      const usecase = new BuildPhaseDependencyGraphUseCase(provider);
      // Act
      const actual = await usecase.execute({ includeArtifacts: true });
      // Assert
      expect(actual.nodes.map((n) => n.skillName)).toEqual(['product-architect']);
    });

    it('standard プリセットで Level 1-2 のノード集合を返す', async () => { /* ... */ });
    it('full プリセットで Level 1-3 の全ノード集合を返す', async () => { /* ... */ });

    it('minimal で storyReflection が無効（enabled=false）', async () => {
      // provider.getStoryReflectionConfig() → enabled: false
    });
    it('full で storyReflection のデフォルト mappings が自動適用される', async () => {
      // provider.getStoryReflectionConfig() → enabled: true, mappings: [logical_design, domain_model, ...]
    });
  });
});
```

---

## 6. QA（不明点・確認事項）

### [Question] Q1: `FileSystemStoryReflectionAdapter` の所有 Unit
A-4-3 で `FileSystemStoryReflectionAdapter` を新設する際、配置先は本 Unit (`phase-dependency-model/infrastructure/filesystem/`) か、それとも `agent-integration/` か？ 本計画では本 Unit 所有として IT に含めている。

[Answer]
（人間が回答を記入）

### [Question] Q2: `CheckPhaseCommandHandler` / `CheckReadyCommandHandler` の返却型
`process.exit` 副作用を避けて `CommandResult { exitCode, stdout, stderr }` を返す前提で擬似コードを書いている。既存の CLI ハンドラ実装と整合するか確認が必要。

[Answer]
（人間が回答を記入）

### [Question] Q3: `PhaseConfigProviderPort.getStoryReflectionConfig` の追加是非
A-4-1 での拡張として `getStoryReflectionConfig()` を Port に追加する案を本計画では前提化している。既存 `PhaseConfigProviderPort` インターフェース変更の影響範囲確認が必要。

[Answer]
（人間が回答を記入）

---

## 7. 前提条件・リスク

### 前提条件

- Domain 層（`PhaseStructure`, `PlanningMode`, `PhaseNode`, `PlanEvidence`, `PhaseCustomizationPolicy` 等）が実装済みであること
- `shared-kernel/harness-config.ts` の `loadConfig()` が `tmpDir` を起点に動作する形で利用可能であること
- `docs/principles/testing-rules.md` に従った AAA パターン・日本語テスト名・`actual` 変数規約を遵守できる状態にあること
- A-2（ドメイン層プリセット定義）が完了しており、`full-phase-dependencies.ts` / `standard-phase-dependencies.ts` / `minimal-phase-dependencies.ts` および `*-story-reflection-defaults.ts` が参照可能であること

### リスク

- **`MarkdownPlanDocumentReader` のフィクスチャ網羅**: QA 節検出ロジックが軽量パースのため、フィクスチャのバリエーションが不十分だと実装時に観測漏れが発生する。特に `## QA（...）` 日本語見出しと `## QA` 半角混在に注意する
- **`HarnessConfigPhaseConfigProvider` の拡張**: A-4-1 で Port シグネチャが変わる可能性があり、Application 層 Fake も同期更新が必要
- **一時ディレクトリクリーンアップ**: CI (GitHub Actions) 上で `os.tmpdir()` の権限問題が発生した場合、ローカル `./tmp-it/` に切り替える代替案を準備する
- **プリセット切替 E2E の脆弱性**: プリセット定義ファイルの将来変更に追従する必要があるため、ノード数の厳密アサーションではなく最小不変条件（例: `minimal.nodes` に `product-architect` を含む、`full.nodes.length > standard.nodes.length > minimal.nodes.length`）で記述するオプションも検討
- **storyReflection の Port 追加**: A-4-1 と Application 層 UseCase の IT テストで追加シグネチャを同時に参照するため、先行して Port を拡張する順序が必要
