# ITテスト設計計画: phase-dependency-model

> **作成日**: 2026-03-13
> **対応ストーリー**: H02-01, H02-02, H02-03
> **正規ソース**: `docs/product/construction/phase-dependency-model/logical_design.md`

---

## 1. スコープ

- 対象Unit: phase-dependency-model
- 論理設計に定義されたapplication層（UseCase・Applicationサービス）、infrastructure層（Adapter）、presentation層（Handler・Facade）が対象
- domain層はユニットテストで検証済みのため、ITテストではdomain実体をそのまま使用する

### テスト対象コンポーネント一覧

| 層 | コンポーネント | テストファイル |
|----|-------------|-------------|
| application (UseCase) | CheckPhaseGateUseCase | `check-phase-gate-usecase.test.ts` |
| application (UseCase) | BuildPhaseDependencyGraphUseCase | `build-phase-dependency-graph-usecase.test.ts` |
| application (UseCase) | GetPhaseInfoUseCase | `get-phase-info-usecase.test.ts` |
| application (UseCase) | ValidateCustomizationPolicyUseCase | `validate-customization-policy-usecase.test.ts` |
| application (UseCase) | RecordPhaseOverrideAuditUseCase | `record-phase-override-audit-usecase.test.ts` |
| application (サービス) | EvidenceBundleAssembler | `check-phase-gate-usecase.test.ts` 内で統合検証 |
| application (サービス) | PhaseInfoResolver | `get-phase-info-usecase.test.ts` 内で統合検証 |
| application (サービス) | PhaseGateResultMapper | `check-phase-gate-usecase.test.ts` 内で統合検証 |
| application (DTO) | customization-validation-result-dto.ts | — (※1) |
| application (DTO) | phase-dependency-graph-dto.ts | — (※1) |
| application (DTO) | phase-gate-result-dto.ts | — (※1) |
| application (DTO) | phase-info-dto.ts | — (※1) |
| infrastructure | FileSystemArtifactExistenceChecker | `file-system-artifact-existence-checker.test.ts` |
| infrastructure | HarnessConfigPhaseConfigProvider | `harness-config-phase-config-provider.test.ts` |
| infrastructure | MarkdownPlanDocumentReader | `markdown-plan-document-reader.test.ts` |
| infrastructure | PhaseOverrideAuditLogger | `phase-override-audit-logger.test.ts` |
| presentation | CheckPhaseCommandHandler | `check-phase-command-handler.test.ts` |
| presentation | CheckReadyCommandHandler | `check-ready-command-handler.test.ts` |
| presentation | PhaseGateValidatorFacade | `phase-gate-validator-facade.test.ts` |
| presentation | PhaseInfoPresenter | `check-phase-command-handler.test.ts` 内で統合検証 |
| presentation | PhaseGateResultPresenter | `check-ready-command-handler.test.ts` 内で統合検証 |

> **※1 DTO除外理由**: `customization-validation-result-dto.ts`, `phase-dependency-graph-dto.ts`, `phase-gate-result-dto.ts`, `phase-info-dto.ts` はTypeScript型定義のみで振る舞いを持たないため、個別のテストは設けない。各DTOの構造正当性はUseCase経由の出力検証で間接的に検証する。

---

## 2. テスト対象分析

### Application層（UseCase）

| UseCase名 | 依存Port数 | テストケース概算 |
|-----------|----------|---------------|
| CheckPhaseGateUseCase | 3 (PhaseConfigProviderPort, EvidenceBundleAssembler経由でArtifactExistenceCheckerPort + PlanDocumentReaderPort, PhaseAuditLoggerPort) | 8〜10件 |
| BuildPhaseDependencyGraphUseCase | 1 (PhaseConfigProviderPort) | 5〜6件 |
| GetPhaseInfoUseCase | 3 (PhaseConfigProviderPort, EvidenceBundleAssembler, PhaseInfoResolver) | 6〜8件 |
| ValidateCustomizationPolicyUseCase | 1 (PhaseConfigProviderPort) | 5〜6件 |
| RecordPhaseOverrideAuditUseCase | 1 (PhaseAuditLoggerPort) | 4〜5件 |

**CheckPhaseGateUseCase テストケース内訳**:

| カテゴリ | テストケース概算 |
|---------|---------------|
| 正常系: phase-gate通過 | 2 |
| 正常系: override適用時に監査ログ記録 | 2 |
| 異常系: 前提成果物欠損でgate失敗 | 2 |
| 異常系: PlanEvidence不足でgate失敗 | 2 |
| 異常系: ドメインエラー伝播 | 2 |

**GetPhaseInfoUseCase テストケース内訳**:

| カテゴリ | テストケース概算 |
|---------|---------------|
| 正常系: currentLevel/completedNodes/nextNodes算出 | 3 |
| 正常系: storyId指定時の絞り込み | 2 |
| 異常系: 設定取得失敗 | 1 |
| 異常系: plan文書解析失敗 | 1 |

**BuildPhaseDependencyGraphUseCase テストケース内訳**:

| カテゴリ | テストケース概算 |
|---------|---------------|
| 正常系: デフォルトポリシーで全ノード・全依存のグラフDTO返却 | 1 |
| 正常系: includeArtifacts=trueで成果物パスがノードDTOに含まれる | 1 |
| 正常系: includeArtifacts=false（未指定）で成果物パスが省略される | 1 |
| 異常系: NonRelaxableDependencyOverrideErrorの伝播 | 1 |
| 異常系: CyclicPhaseDependencyErrorの伝播 | 1 |
| 境界値: カスタムルール適用後の有効依存がグラフに反映される | 1 |

**ValidateCustomizationPolicyUseCase テストケース内訳**:

| カテゴリ | テストケース概算 |
|---------|---------------|
| 正常系: valid=trueで返却 | 1 |
| 異常系: InvalidCustomRuleError→errors変換 | 1 |
| 異常系: NonRelaxableDependencyOverrideError→errors変換 | 1 |
| 異常系: CyclicPhaseDependencyError→errors変換 | 1 |
| 正常系: warnings付きvalid=true | 1 |

**RecordPhaseOverrideAuditUseCase テストケース内訳**:

| カテゴリ | テストケース概算 |
|---------|---------------|
| 正常系: auditLoggerのrecordが正しいペイロードで呼び出される | 1 |
| 正常系: generatedAtがISO8601形式で生成される | 1 |
| 異常系: auditLogger失敗時にAuditLogWriteErrorとして上位へ送出 | 1 |
| 境界値: appliedRulesが空配列の場合もrecordが呼び出される | 1 |

### Application層（Applicationサービス）

| サービス名 | 依存Port数 | テストケース概算 |
|-----------|----------|---------------|
| EvidenceBundleAssembler | 3 (ArtifactExistenceCheckerPort, PlanDocumentReaderPort, PhaseConfigProviderPort) | 5〜6件 |
| PhaseInfoResolver | 0（純粋計算） | 4〜5件 |
| PhaseGateResultMapper | 0（DTO変換） | 2〜3件 |

### Infrastructure層（Adapter）

| Adapter名 | 操作数 | テストケース概算 |
|-----------|-------|---------------|
| FileSystemArtifactExistenceChecker | 1 (checkAll) | 5〜6件 |
| MarkdownPlanDocumentReader | 1 (readEvidence) | 8〜10件 |
| HarnessConfigPhaseConfigProvider | 3 (getPlanningMode, getCustomizationPolicy, getReportingOutputDir) | 6〜8件 |
| PhaseOverrideAuditLogger | 1 (record) | 3〜4件 |

**FileSystemArtifactExistenceChecker テストケース内訳**:

| カテゴリ | テストケース概算 |
|---------|---------------|
| 正常系: 存在するファイルのMap返却 | 1 |
| 正常系: 存在しないファイルのMap返却 | 1 |
| 正常系: プレースホルダ解決後の判定 | 1 |
| 異常系: storyId未指定で必要な成果物はfalse | 1 |
| 正常系: required=falseの成果物もMapに含まれる | 1 |

**MarkdownPlanDocumentReader テストケース内訳**:

| カテゴリ | テストケース概算 |
|---------|---------------|
| 正常系: plan文書存在 + QA節あり + 全回答済み | 1 |
| 正常系: plan文書存在 + QA節あり + 未回答あり | 1 |
| 正常系: plan文書存在 + QA節なし | 1 |
| 異常系: plan文書不存在 → PlanEvidence(false, false, false) | 1 |
| 正常系: interactive時のplanningModeMatch判定 | 1 |
| 正常系: embedded-qa時のplanningModeMatch判定 | 1 |
| 正常系: 見出しが壊れている場合のフォールバック | 1 |
| 正常系: QA節の「## QA（設計判断の根拠）」形式の検出 | 1 |

**HarnessConfigPhaseConfigProvider テストケース内訳**:

| カテゴリ | テストケース概算 |
|---------|---------------|
| 正常系: default PlanningMode取得 | 1 |
| 正常系: perPhase PlanningMode取得（scope指定） | 1 |
| 正常系: customRulesからCustomRuleへの正規化 | 1 |
| 正常系: preset + overrideの変換 | 1 |
| 正常系: reportingOutputDirの取得 | 1 |
| 正常系: relaxedGatesはLevel間依存緩和として解釈しない | 1 |

**PhaseOverrideAuditLogger テストケース内訳**:

| カテゴリ | テストケース概算 |
|---------|---------------|
| 正常系: JSONL形式で追記される | 1 |
| 正常系: 複数回recordで追記される | 1 |
| 異常系: 書込失敗時に例外送出 | 1 |

### Presentation層（Handler/Facade/Presenter）

| コマンド/エンドポイント | メソッド | テストケース概算 |
|---------------------|--------|---------------|
| CheckPhaseCommandHandler | execute | 5〜6件 |
| CheckReadyCommandHandler | execute | 5〜6件 |
| PhaseGateValidatorFacade | validate | 4〜5件 |
| PhaseInfoPresenter | format | 3〜4件 |
| PhaseGateResultPresenter | format | 3〜4件 |

**CheckPhaseCommandHandler テストケース内訳**:

| カテゴリ | テストケース概算 |
|---------|---------------|
| 正常系: テキスト出力 (exit code 0) | 1 |
| 正常系: --json指定でJSON出力 | 1 |
| 正常系: --story指定でStory絞り込み | 1 |
| 異常系: Unit未検出 (exit code 1) | 1 |
| 異常系: 設定取得失敗 (exit code 2) | 1 |

**CheckReadyCommandHandler テストケース内訳**:

| カテゴリ | テストケース概算 |
|---------|---------------|
| 正常系: 全scope ready (exit code 0) | 1 |
| 異常系: 1件でも未充足 (exit code 1) | 1 |
| 正常系: --json指定でJSON出力 | 1 |
| 正常系: --unit/--story指定で絞り込み | 1 |
| 異常系: 設定取得失敗 (exit code 2) | 1 |

**PhaseGateValidatorFacade テストケース内訳**:

| カテゴリ | テストケース概算 |
|---------|---------------|
| 正常系: gate通過時は空のHarnessError[] | 1 |
| 異常系: gate失敗時にHarnessError[]を返す | 1 |
| 正常系: storyId有無でtargetLevel決定 | 2 |

**PhaseInfoPresenter テストケース内訳**:

| カテゴリ | テストケース概算 |
|---------|---------------|
| 正常系: PhaseInfoDtoをテキスト形式に整形 | 1 |
| 正常系: PhaseInfoDtoをJSON形式に整形 | 1 |
| 境界値: completedNodesが空の場合の出力 | 1 |

**PhaseGateResultPresenter テストケース内訳**:

| カテゴリ | テストケース概算 |
|---------|---------------|
| 正常系: passed=trueのPhaseGateResultDtoをテキスト形式に整形 | 1 |
| 正常系: passed=falseのPhaseGateResultDtoをテキスト形式に整形（blockers表示） | 1 |
| 正常系: PhaseGateResultDtoをJSON形式に整形 | 1 |

---

## 3. テスト方針

### モック方針

- **Port（外部依存）のみモック使用可**: ArtifactExistenceCheckerPort, PlanDocumentReaderPort, PhaseConfigProviderPort, PhaseAuditLoggerPortはFake/Stubを使用する
- **ドメイン実体はモック禁止**: PhaseStructure, 値オブジェクト群は実体を使用する
- **Application層テスト**: PortのみFake化し、PhaseStructureは`createDefault()`で実体を生成して使用する
- **Infrastructure層テスト**: 実ファイルシステムを使用する。一時ディレクトリ（`fs.mkdtempSync()` + cleanup）で検証する
- **Presentation層テスト**: UseCaseをStub化し、引数パースとoutput整形を検証する

### phase-dependency-modelの外部依存

- phase-dependency-modelはファイルI/Oのみが外部依存である
- Infrastructure層の4つのAdapterがファイルシステムアクセスを担当する
- `shared-kernel/harness-config.ts` 経由でのHarnessConfigV2取得もInfrastructure層に閉じる

### テスト規約

- **AAAパターン**: 全テストケースでArrange/Act/Assertを明記する
- **テストケース名は日本語**: 何も知らない開発者が読んでわかる表現にする
- **実行結果はactualに代入**: `const actual = ...` で統一する
- **describe/it構造**: target/describe/context/itパターンを使用する
- **ファイル名**: kebab-caseで統一する
- **一時ディレクトリ**: Infrastructure層テストでは`fs.mkdtempSync()`で一時ディレクトリを作成し、テスト終了後にクリーンアップする

### テスト構造例

```
target('execute', () => {
  describe('指定scopeがtarget levelへ進めるかを判定する', () => {
    context('全前提成果物が存在しPlanEvidenceも充足している場合', () => {
      it('passed=trueのPhaseGateResultDtoを返す', ...);
    });
    context('override適用時にauditPayloadがある場合', () => {
      it('auditLoggerのrecordが呼び出される', ...);
    });
  });
});
```

---

## 4. QA（不明点・確認事項）

- なし（論理設計に十分な定義がある）

---

## 5. 前提条件・リスク

### 前提条件

- domain層の実装が完了していること（ITテストはdomain実体を使用するため）
- `shared-kernel/harness-config.ts` のHarnessConfigV2ローダが利用可能であること
- テスト用のMarkdownファイル（QA節あり/なし/壊れたフォーマット等）を`__tests__`配下にfixture化しておくこと

### リスク

- MarkdownPlanDocumentReaderのテストは、QA節の検出ロジックが軽量パース（AST不使用）のため、fixture ファイルのバリエーションを十分に用意する必要がある
- HarnessConfigPhaseConfigProviderのテストは、`shared-kernel/harness-config.ts`の実装に依存するため、shared-kernelのインターフェースが先行確定している必要がある
- PhaseOverrideAuditLoggerのテストは、ファイルシステム操作を伴うため、CI環境での一時ディレクトリの権限に注意すること
