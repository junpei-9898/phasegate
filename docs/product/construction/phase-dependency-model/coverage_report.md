# テストカバレッジレポート: phase-dependency-model

<!-- @coverage-gating: ungated-legacy -->
<!-- WI-258 / ADR-030 §Decision.3.②: 本レポートは attestation ゲート導入前の非ゲート ✅ を含む見える負債。各 ✅ に @attestation を付与して段階返済し、返済完了後にこのマーカーを除去すること。L2-016 は本マーカーがある間 warning で件数報告する。 -->

@story-id H02-01
@story-id H02-02
@story-id H02-03
## 1. サマリー

> 集計方針: `⚠️ 一部カバー` は未カバーとして集計。HTTP APIエンドポイントは存在しないため、API観点は集計対象外。

| 観点 | カバー項目数 | 未カバー項目数 | カバレッジ率 |
|------|------------|--------------|------------|
| 受け入れ基準 | 15 | 0 | 100% |
| ドメインロジック | 18 | 0 | 100% |
| UseCase | 10 | 0 | 100% |
| **総合** | **43** | **0** | **100%** |

前回未カバーだった8項目は、`UT-PD-115〜133` および `IT-PD-088〜102` の追加で解消された。WI-085（ADR-016: phase-gate validator paths config プレースホルダ化）対応として `UT-PD-049/098/099/110/150〜152` の意味更新および `UT-PD-169〜177` / `IT-PD-123〜130` を追加し、Artifact 仕様変更・PhaseConfigProviderPort.getPathRoots・EvidenceBundleAssembler/FileSystemArtifactExistenceChecker の paths 流入経路を網羅。

### 判定結果
- ✅ 90%以上: テストロジック設計に進んで問題なし
- ⚠️ 70-90%: 未カバー項目の確認を推奨
- ❌ 70%未満: テストケース設計の追加が必要
- **本Unitの判定**: ✅ 100%（`unit_test_logic.md` / `it_test_logic.md` へ進行可能）

## 2. 受け入れ基準カバレッジ詳細

| AC ID | 基準内容 | 対応テストケース | カバー状態 |
|------|---------|----------------|----------|
| AC-PD-01 | 3層フェーズ構造を定義し、各Levelのフェーズと成果物を保持できる | UT-PD-001〜003, UT-PD-019〜024, IT-PD-011〜013 | ✅ カバー |
| AC-PD-02 | Level 2前提なしのLevel 3開始をphase-gateが拒否する | UT-PD-010〜012, IT-PD-001, IT-PD-005 | ✅ カバー |
| AC-PD-03 | Level内で上流設計なしの下流設計生成をphase-gateが拒否する | UT-PD-118〜120, IT-PD-091〜092 | ✅ カバー |
| AC-PD-04 | 設計文書・plan文書なしの実装コード変更をphase-gateが拒否する | UT-PD-115〜117, IT-PD-088〜090 | ✅ カバー |
| AC-PD-05 | Level間依存の緩和不可を検証するテストが存在する | UT-PD-005, UT-PD-026〜027, IT-PD-014, IT-PD-027, IT-PD-064 | ✅ カバー |
| AC-PD-06 | `interactive` モードを定義し、その意味論を検証できる | UT-PD-013〜014, UT-PD-065, UT-PD-068, IT-PD-007, IT-PD-055 | ✅ カバー |
| AC-PD-07 | `embedded-qa` モードを定義し、その意味論を検証できる | UT-PD-015〜016, UT-PD-066, UT-PD-068, IT-PD-006, IT-PD-056 | ✅ カバー |
| AC-PD-08 | 両Planning Modeで `inception/` 配下の `*_plan.md` 成果物を前提に扱える | UT-PD-121〜123, IT-PD-093〜095 | ✅ カバー |
| AC-PD-09 | plan文書のファイル存在でPhase完了判定を検証する | UT-PD-007〜009, UT-PD-121〜123, IT-PD-054, IT-PD-095 | ✅ カバー |
| AC-PD-10 | plan文書にQAセクションが含まれることを検証する | UT-PD-013〜016, IT-PD-051〜058 | ✅ カバー |
| AC-PD-11 | `phasegate.config.json.phaseDependencies` を読み取り、意味論へ正規化できる | IT-PD-061〜064 | ✅ カバー |
| AC-PD-12 | `customRules` による依存追加を適用できる | UT-PD-131〜133, IT-PD-016, IT-PD-061, IT-PD-101〜102 | ✅ カバー |
| AC-PD-13 | デフォルト依存の削除には `override: true` を要求する | UT-PD-124〜126, IT-PD-096〜098 | ✅ カバー |
| AC-PD-14 | `story-implementor` 前のテスト設計フェーズ存在は緩和不可である | UT-PD-028 | ✅ カバー |
| AC-PD-15 | Level間依存（Level 2→1, Level 3→2）は緩和不可である | UT-PD-005, UT-PD-026〜027, UT-PD-126, IT-PD-014, IT-PD-027, IT-PD-064, IT-PD-098 | ✅ カバー |

## 3. ドメインロジックカバレッジ詳細

### 集約

| 集約名 | 不変条件 | 対応テストケース | カバー状態 |
|------|---------|----------------|----------|
| PhaseStructure | INV-1: Level 2開始にはLevel 1成果物が全て必要 | UT-PD-007〜009, IT-PD-002, IT-PD-005 | ✅ カバー |
| PhaseStructure | INV-2: Level 3開始にはLevel 2成果物が全て必要 | UT-PD-010〜012, IT-PD-001, IT-PD-005 | ✅ カバー |
| PhaseStructure | INV-3: Level間依存は緩和不可 | UT-PD-025〜027, UT-PD-126, IT-PD-014, IT-PD-027, IT-PD-064, IT-PD-098 | ✅ カバー |
| PhaseStructure | INV-4: `interactive` 時はQAセクション必須 | UT-PD-013〜014, IT-PD-053, IT-PD-055 | ✅ カバー |
| PhaseStructure | INV-5: `embedded-qa` 時はQ&A完了必須 | UT-PD-015〜016, IT-PD-051〜052, IT-PD-056 | ✅ カバー |
| PhaseStructure | INV-6: `override: true` でもLevel間依存とTDD最低保証は緩和不可 | UT-PD-027〜029, UT-PD-126, IT-PD-027〜028, IT-PD-098 | ✅ カバー |
| PhaseStructure | INV-7: override適用時は監査ペイロードを返す | UT-PD-030〜031, IT-PD-003, IT-PD-045 | ✅ カバー |

### エンティティ

該当なし。`domain_model.md` ではエンティティを採用しておらず、`PlanDocument` は `PlanEvidence` 値オブジェクトへ降格されている。

### 値オブジェクト

| 値オブジェクト名 | 制約 | 対応テストケース | カバー状態 |
|------|------|----------------|----------|
| PhaseLevel | `1/2/3` のみ許可し、Level比較が正しく機能する | UT-PD-036〜046, UT-PD-089〜094 | ✅ カバー |
| Artifact | 任意の相対パスを許可（WI-085: `docs/` 接頭辞撤廃）、許可外プレースホルダ（`{designDocsRoot}` / `{inceptionDocsRoot}` / `{unit}` / `{storyId}` 以外）禁止、`required=true` では未解決プレースホルダを禁止する | UT-PD-047〜053, UT-PD-095〜099, UT-PD-169〜177, IT-PD-048〜050, IT-PD-126〜127 | ✅ カバー |
| PhaseNode | Level 3のstory scope必須成果物は `{storyId}` を含む | UT-PD-054〜059, UT-PD-127 | ✅ カバー |
| PhaseDependency | 自己依存禁止、依存種別は `requires/recommends` のみ | UT-PD-060〜064 | ✅ カバー |
| PhaseDependency | `recommends` はphase-gate失敗要因にしない | UT-PD-128〜129, IT-PD-099〜100 | ✅ カバー |
| PlanningMode | `interactive` はQAセクション存在を要求する | UT-PD-013〜014, UT-PD-065, UT-PD-068, IT-PD-055 | ✅ カバー |
| PlanningMode | `embedded-qa` はQA全回答を要求する | UT-PD-015〜016, UT-PD-066, UT-PD-068, IT-PD-056 | ✅ カバー |
| PlanEvidence | `exists=false` なら他属性もfalse、`planningModeMatch=true` なら `exists=true` | UT-PD-070〜074, UT-PD-103〜107 | ✅ カバー |
| CustomRule | `targetPhase` 必須、`action` 1件以上、追加依存のみを表す | UT-PD-075〜078, UT-PD-130〜131 | ✅ カバー |
| PhaseCustomizationPolicy | `preset/rules/override` の意味論を保持し、`preset=default + rules` を追加依存として扱う | UT-PD-079〜083, UT-PD-132〜133, IT-PD-062, IT-PD-101〜102 | ✅ カバー |
| PhaseGateResult | `passed=false` ならblockers必須、override時のみauditPayloadを保持する | UT-PD-084〜088, IT-PD-043〜045 | ✅ カバー |

## 4. UseCaseカバレッジ詳細

| UseCase名 | 正常系 | 異常系 | カバー状態 |
|---------|------|------|----------|
| CheckPhaseGateUseCase | IT-PD-001〜004, IT-PD-010, IT-PD-093〜094, IT-PD-099〜100 | IT-PD-005〜009, IT-PD-091〜095 | ✅ カバー |
| BuildPhaseDependencyGraphUseCase | IT-PD-011〜013, IT-PD-016, IT-PD-101〜102 | IT-PD-014〜015 | ✅ カバー |
| GetPhaseInfoUseCase | IT-PD-017〜021 | IT-PD-022〜023 | ✅ カバー |
| ValidateCustomizationPolicyUseCase | IT-PD-024〜025, IT-PD-097 | IT-PD-026〜028, IT-PD-096, IT-PD-098 | ✅ カバー |
| RecordPhaseOverrideAuditUseCase | IT-PD-029〜030, IT-PD-032 | IT-PD-031 | ✅ カバー |

HTTP APIエンドポイントは存在せず、外部境界はCLI/validatorとして `IT-PD-068〜090` で検証されている。

## 5. 未カバー項目一覧

### 優先度: 高（受け入れ基準に関連）

- 該当なし。前回未カバーだった AC-PD-03 / 04 / 08 / 13 は `UT-PD-115〜126` および `IT-PD-088〜098` で解消された。

### 優先度: 中（ドメインロジック）

- 該当なし。前回ギャップだった `PhaseNode` / `PhaseDependency` / `CustomRule` / `PhaseCustomizationPolicy` は `UT-PD-127〜133` と `IT-PD-099〜102` で解消された。

### 優先度: 低（網羅性向上）

- 該当なし。現行のUnit定義・ドメインモデル・論理設計・テスト設計の範囲では追加必須ケースはない。

## 6. 推奨追加ケース

- 現時点で必須追加ケースはない。
- 仕様追加時は `changedFiles`、`PlanningMode`、`override`、`recommends` の境界条件を優先的に再評価する。
- `phaseDependencies` の意味論が拡張された場合は、`preset=default + customRules` の扱いを最初に再採点する。

## 7. 次のアクション

1. `UT-PD-115〜133` と `IT-PD-088〜102` を含めて `unit_test_logic.md` / `it_test_logic.md` へ詳細化する。
2. 実装時は `changedFiles`、`override`、`recommends`、`preset=default + customRules` を回帰テストの固定観点にする。
3. 現行カバレッジは100%のため、テストロジック設計へ進む。

## WI-165: Coverage Refresh For WI-117..148

@work-item-id WI-165

Phase-dependency coverage remains focused on design order and phase gate scope. WI-117..148 reflection does not add new phase graph nodes; it adds downstream product evidence and setup lifecycle surfaces. Therefore this report considers the existing `changedFiles`, custom path, recommends, and override cases sufficient, and treats WI status freshness as validator-system `L2-014` rather than a phase-dependency rule.
