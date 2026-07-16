# テストカバレッジレポート: phase-dependency-model

<!-- @coverage-gating: ungated-legacy -->
<!-- WI-258 / ADR-030 §Decision.3.②: 本レポートは attestation ゲート導入前の非ゲート ✅ を含む見える負債。各 ✅ に @attestation を付与して段階返済し、返済完了後にこのマーカーを除去すること。L2-016 は本マーカーがある間 warning で件数報告する。 -->

@story-id H02-01
@story-id H02-02
@story-id H02-03

> **2026-07-15 反ロンダリング訂正（WI-270）**: 本レポートの旧「✅ 100%（43/43）」は、実在しないテストケース ID を ✅ の根拠に引用した水増し（laundering）であった。特に「100% 到達の根拠」とされた `UT-PD-115〜133` / `IT-PD-088〜102` は実テストツリーに存在せず（実 UT-PD は 114 まで・IT-PD は限られた番号のみ）、§4 UseCase 表の全 `IT-PD-*` 引用も不在である。全 cited ID を `grep -rlF` で照合し、不在 ID を除去、実在 ID が 0 の行を ❌ へ格下げした。詳細は末尾「訂正履歴」を参照。

## 1. サマリー

> 集計方針: `⚠️ 一部カバー` / `❌ 未カバー` は未カバーとして集計。HTTP APIエンドポイントは存在しないため、API観点は集計対象外。

| 観点 | カバー項目数 | 未カバー項目数 | カバレッジ率 |
|------|------------|--------------|------------|
| 受け入れ基準 | 9 | 6 | 60.0% |
| ドメインロジック | 17 | 1 | 94.4% |
| UseCase | 0 | 5 | 0% |
| **総合** | **26** | **12** | **68.4%** |

> **訂正（2026-07-15, WI-270）**: 旧「総合 43/0 = 100%」は取消し。受け入れ基準 6 行（AC-PD-03/04/08/11/12/13）、ドメインロジック 1 行（PhaseDependency「recommends はphase-gate失敗要因にしない」）、UseCase 全 5 行は、唯一の根拠だった `UT-PD-115〜133` / `IT-PD-*`（多くが不在）が実テストツリーに存在しないため ❌ とした。分子=✅ 行数（AC 9 + domain 17 + UseCase 0 = 26）、分母=38（AC 15 + domain 18 + UseCase 5）。旧サマリの「UseCase 10」は表の 5 UseCase に対する内訳数であり、本訂正では item 数を UseCase 表の 5 行で数える。

### 判定結果
- ✅ 90%以上: テストロジック設計に進んで問題なし
- ⚠️ 70-90%: 未カバー項目の確認を推奨
- ❌ 70%未満: テストケース設計の追加が必要
- **本Unitの判定**: ❌ 68.4%（訂正後の実カバレッジ）。実在する `UT-PD-*`（001〜114 の範囲）と限られた `IT-PD-*`（103〜107 / 123〜130 の範囲）で裏付けられる行のみ ✅。旧レポートが「前回未カバー8項目を解消」と主張した `UT-PD-115〜133` / `IT-PD-088〜102` は 1 件も実在しない。

> **注記**: 実スイート `Tests 347 passed` は全て pass するが、それは実在する `UT-PD-*` ドメインテスト等が通るためであり、§4 UseCase 表が引用する不在 `IT-PD-*` とは無関係。実ソースは実装済みであり、これはテスト/引用のギャップである。

## 2. 受け入れ基準カバレッジ詳細

| AC ID | 基準内容 | 対応テストケース | カバー状態 |
|------|---------|----------------|----------|
| AC-PD-01 | 3層フェーズ構造を定義し、各Levelのフェーズと成果物を保持できる | UT-PD-001〜003, UT-PD-019〜024 | ✅ カバー |
| AC-PD-02 | Level 2前提なしのLevel 3開始をphase-gateが拒否する | UT-PD-010〜012 | ✅ カバー |
| AC-PD-03 | Level内で上流設計なしの下流設計生成をphase-gateが拒否する | 実装テスト不在（旧引用 UT-PD-118〜120 / IT-PD-091〜092 は不在） | ❌ 未カバー |
| AC-PD-04 | 設計文書・plan文書なしの実装コード変更をphase-gateが拒否する | 実装テスト不在（旧引用 UT-PD-115〜117 / IT-PD-088〜090 は不在） | ❌ 未カバー |
| AC-PD-05 | Level間依存の緩和不可を検証するテストが存在する | UT-PD-005, UT-PD-026, UT-PD-027 | ✅ カバー |
| AC-PD-06 | `interactive` モードを定義し、その意味論を検証できる | UT-PD-013, UT-PD-014 | ✅ カバー |
| AC-PD-07 | `embedded-qa` モードを定義し、その意味論を検証できる | UT-PD-015, UT-PD-016 | ✅ カバー |
| AC-PD-08 | 両Planning Modeで `inception/` 配下の `*_plan.md` 成果物を前提に扱える | 実装テスト不在（旧引用 UT-PD-121〜123 / IT-PD-093〜095 は不在） | ❌ 未カバー |
| AC-PD-09 | plan文書のファイル存在でPhase完了判定を検証する | UT-PD-007〜009 | ✅ カバー |
| AC-PD-10 | plan文書にQAセクションが含まれることを検証する | UT-PD-013〜016 | ✅ カバー |
| AC-PD-11 | `phasegate.config.json.phaseDependencies` を読み取り、意味論へ正規化できる | 実装テスト不在（旧引用 IT-PD-061〜064 は不在） | ❌ 未カバー |
| AC-PD-12 | `customRules` による依存追加を適用できる | 実装テスト不在（旧引用 UT-PD-131〜133 / IT-PD-016/061/101〜102 は不在） | ❌ 未カバー |
| AC-PD-13 | デフォルト依存の削除には `override: true` を要求する | 実装テスト不在（旧引用 UT-PD-124〜126 / IT-PD-096〜098 は不在） | ❌ 未カバー |
| AC-PD-14 | `story-implementor` 前のテスト設計フェーズ存在は緩和不可である | UT-PD-028 | ✅ カバー |
| AC-PD-15 | Level間依存（Level 2→1, Level 3→2）は緩和不可である | UT-PD-005, UT-PD-026, UT-PD-027 | ✅ カバー |

> **AC 訂正（2026-07-15, WI-270）**: 旧レポートは「前回未カバーだった AC-PD-03/04/08/13 を UT-PD-115〜126 / IT-PD-088〜098 で解消した」と記していたが、これらの ID は 1 件も実在しない。AC-PD-03/04/08/11/12/13 は唯一の根拠が不在のため ❌。残る ✅ 行は実在 `UT-PD-*`（001〜028 等）で主要根拠が保たれるため維持（範囲引用に混在した不在 ID は除去）。

## 3. ドメインロジックカバレッジ詳細

### 集約

| 集約名 | 不変条件 | 対応テストケース | カバー状態 |
|------|---------|----------------|----------|
| PhaseStructure | INV-1: Level 2開始にはLevel 1成果物が全て必要 | UT-PD-007〜009 | ✅ カバー |
| PhaseStructure | INV-2: Level 3開始にはLevel 2成果物が全て必要 | UT-PD-010〜012 | ✅ カバー |
| PhaseStructure | INV-3: Level間依存は緩和不可 | UT-PD-025〜027 | ✅ カバー |
| PhaseStructure | INV-4: `interactive` 時はQAセクション必須 | UT-PD-013, UT-PD-014 | ✅ カバー |
| PhaseStructure | INV-5: `embedded-qa` 時はQ&A完了必須 | UT-PD-015, UT-PD-016 | ✅ カバー |
| PhaseStructure | INV-6: `override: true` でもLevel間依存とTDD最低保証は緩和不可 | UT-PD-027〜029 | ✅ カバー |
| PhaseStructure | INV-7: override適用時は監査ペイロードを返す | UT-PD-030, UT-PD-031 | ✅ カバー |

### エンティティ

該当なし。`domain_model.md` ではエンティティを採用しておらず、`PlanDocument` は `PlanEvidence` 値オブジェクトへ降格されている。

### 値オブジェクト

| 値オブジェクト名 | 制約 | 対応テストケース | カバー状態 |
|------|------|----------------|----------|
| PhaseLevel | `1/2/3` のみ許可し、Level比較が正しく機能する | UT-PD-039〜046, UT-PD-089, UT-PD-092〜094 | ✅ カバー |
| Artifact | 任意の相対パスを許可（WI-085: `docs/` 接頭辞撤廃）、許可外プレースホルダ（`{designDocsRoot}` / `{inceptionDocsRoot}` / `{unit}` / `{storyId}` 以外）禁止、`required=true` では未解決プレースホルダを禁止する | UT-PD-047〜053, UT-PD-095〜099, UT-PD-169〜177, IT-PD-126, IT-PD-127 | ✅ カバー |
| PhaseNode | Level 3のstory scope必須成果物は `{storyId}` を含む | UT-PD-054〜059 | ✅ カバー |
| PhaseDependency | 自己依存禁止、依存種別は `requires/recommends` のみ | UT-PD-062〜064 | ✅ カバー |
| PhaseDependency | `recommends` はphase-gate失敗要因にしない | 実装テスト不在（旧引用 UT-PD-128〜129 / IT-PD-099〜100 は不在） | ❌ 未カバー |
| PlanningMode | `interactive` はQAセクション存在を要求する | UT-PD-013, UT-PD-014 | ✅ カバー |
| PlanningMode | `embedded-qa` はQA全回答を要求する | UT-PD-015, UT-PD-016 | ✅ カバー |
| PlanEvidence | `exists=false` なら他属性もfalse、`planningModeMatch=true` なら `exists=true` | UT-PD-070〜074, UT-PD-103〜107 | ✅ カバー |
| CustomRule | `targetPhase` 必須、`action` 1件以上、追加依存のみを表す | UT-PD-075〜078 | ✅ カバー |
| PhaseCustomizationPolicy | `preset/rules/override` の意味論を保持し、`preset=default + rules` を追加依存として扱う | UT-PD-079〜083 | ✅ カバー |
| PhaseGateResult | `passed=false` ならblockers必須、override時のみauditPayloadを保持する | UT-PD-084〜088 | ✅ カバー |

> **ドメイン訂正（2026-07-15, WI-270）**: PhaseDependency「recommends はphase-gate失敗要因にしない」は唯一の根拠 `UT-PD-128〜129` / `IT-PD-099〜100` が不在のため ❌。他の VO 行は範囲引用に混在した不在 ID（UT-PD-036〜038/090/091/126/127/130〜133, IT-PD-043〜050/062/101〜102 等）を除去し、実在 `UT-PD-*` の裏付けが残るため ✅ を維持。

## 4. UseCaseカバレッジ詳細

> **訂正（2026-07-15, WI-270）**: 下記 5 UseCase に引用されていた `IT-PD-001〜032` / `IT-PD-068〜102` の連番 ID は、**実テストツリーに 1 件も存在しない**（実在する `IT-PD-*` は 103〜107 / 123〜130 の範囲に限られ、いずれも §4 で引用されていない）。全 UseCase 行を ❌ へ格下げする。

| UseCase名 | 正常系 | 異常系 | カバー状態 |
|---------|------|------|----------|
| CheckPhaseGateUseCase | 実装テスト不在（旧引用 IT-PD-001〜010/091〜100 は不在） | 実装テスト不在 | ❌ 未カバー |
| BuildPhaseDependencyGraphUseCase | 実装テスト不在（旧引用 IT-PD-011〜016/101〜102 は不在） | 実装テスト不在 | ❌ 未カバー |
| GetPhaseInfoUseCase | 実装テスト不在（旧引用 IT-PD-017〜023 は不在） | 実装テスト不在 | ❌ 未カバー |
| ValidateCustomizationPolicyUseCase | 実装テスト不在（旧引用 IT-PD-024〜028/096〜098 は不在） | 実装テスト不在 | ❌ 未カバー |
| RecordPhaseOverrideAuditUseCase | 実装テスト不在（旧引用 IT-PD-029〜032 は不在） | 実装テスト不在 | ❌ 未カバー |

> 旧「HTTP APIエンドポイントは存在せず、外部境界はCLI/validatorとして IT-PD-068〜090 で検証されている」という記述も、`IT-PD-068〜090` が不在のため撤回する。

## 5. 未カバー項目一覧

### 優先度: 高（受け入れ基準・UseCase）

- **AC-PD-03 / 04 / 08 / 11 / 12 / 13**: 旧引用 `UT-PD-115〜133` / `IT-PD-088〜102` が全て不在。実テストが存在しない。
- **UseCase 全 5 種**: §4 の全 `IT-PD-*` 引用が不在。UseCase の統合テストが存在しない。

### 優先度: 中（ドメインロジック）

- **PhaseDependency「recommends はphase-gate失敗要因にしない」**: 旧引用 `UT-PD-128〜129` / `IT-PD-099〜100` が不在。

### 優先度: 低（網羅性向上）

- 実在する `IT-PD-103〜107` / `IT-PD-123〜130` は §2〜§4 で引用されていない。これらを適切な AC/UseCase へ再束縛できる可能性があるが、本 WI では捏造を避けるため再束縛は行わず、後続の実テスト整備フェーズに委ねる。

## 6. 推奨追加ケース

- **最優先**: §4 の 5 UseCase に対する実 IT-PD テスト、および AC-PD-03/04/08/11/12/13 に対応する phase-gate 拒否・plan 前提・config 正規化・customRules・override の実テストを追加する。
- 仕様追加時は `changedFiles`、`PlanningMode`、`override`、`recommends` の境界条件を優先的に再評価する。

## 7. 次のアクション

1. §4 UseCase・AC-PD-03/04/08/11/12/13・PhaseDependency「recommends」に対応する実テストを追加し、`@ac` 束縛する（強制 green を禁止）。
2. 実在する `IT-PD-103〜107` / `IT-PD-123〜130` の担保内容を確認し、適切な AC/UseCase へ再束縛する。
3. 実テスト追加後に L3-005（coverage-report 整合ゲート）で回帰を防止する。

## WI-165: Coverage Refresh For WI-117..148

@work-item-id WI-165

Phase-dependency coverage remains focused on design order and phase gate scope. WI-117..148 reflection does not add new phase graph nodes; it adds downstream product evidence and setup lifecycle surfaces. Therefore this report considers the existing `changedFiles`, custom path, recommends, and override cases sufficient, and treats WI status freshness as validator-system `L2-014` rather than a phase-dependency rule.

## 訂正履歴

### 2026-07-15 — 反ロンダリング実態訂正（WI-270, quick, fix）

<!-- @work-item-id WI-270 -->

WI-267 が実テスト再検証で確定させた laundering の実態訂正。全 cited ID を `grep -rlF "<ID>" scripts/harness/__tests__/` で照合した。

実在テストのインベントリ（正本・実 grep）: **UT-PD は 001〜114 の範囲（欠番あり、最大 177 だが 115〜133 は不在）**、**IT-PD は 103〜107 / 123〜130 の範囲のみ実在**（IT-PD-001〜102 は 1 件も存在しない）。

除去した虚偽引用と格下げ:

1. **§1 サマリー / 判定「✅ 100%（43/0）」→ ❌ 68.4%（26/12）**。
2. **§2 AC-PD-03/04/08/11/12/13 → ❌**。旧「前回未カバー解消」の根拠 `UT-PD-115〜133` / `IT-PD-088〜102` が全て不在。
3. **§3 PhaseDependency「recommends はphase-gate失敗要因にしない」→ ❌**。根拠 `UT-PD-128〜129` / `IT-PD-099〜100` が不在。
4. **§4 UseCase 全 5 種 → ❌**。引用された `IT-PD-001〜032` / `IT-PD-068〜102` が 1 件も実在しない。「外部境界を IT-PD-068〜090 で検証」の記述も撤回。
5. その他の ✅ 行から、範囲引用に混在した不在 ID を除去し、実在 `UT-PD-*` / `IT-PD-103〜107,123〜130` の裏付けが残る行のみ ✅ を維持。

実スイート結果（verbatim・exit 0）: `Test Files 42 passed (42) / Tests 347 passed (347)`。実在テストは全て pass しており、上記 ❌ はフィーチャ欠落ではなく実テスト未実装のギャップである。

**ungated-legacy マーカーは維持**（attestation 発行機構が未実装のため。WI-267 §5 の結論に従う）。✅ を新規追加していない。テストコードは一切変更していない。
