# テストカバレッジレポート: phase-dependency-model

<!-- WI-275: 本レポートは attestation ゲート返済済み（旧 coverage-gating マーカー除去）。各カバー主張に @attestation <story-id> を付与し、L2-016 が形状を、L3-007 が requirement-test-matrix 上での実在（story-id 解決 かつ testReferences>=1）を fail-closed で検証する。カバー印は「実在し pass するテストによる裏付け」を意味する。 -->

@story-id H02-01
@story-id H02-02
@story-id H02-03

> **2026-07-15 反ロンダリング訂正（WI-270）**: 本レポートの旧「カバー印 100%（43/43）」は、実在しないテストケース ID を カバー印 の根拠に引用した水増し（laundering）であった。特に「100% 到達の根拠」とされた `UT-PD-115〜133` / `IT-PD-088〜102` は実テストツリーに存在せず（実 UT-PD は 114 まで・IT-PD は限られた番号のみ）、§4 UseCase 表の全 `IT-PD-*` 引用も不在である。全 cited ID を `grep -rlF` で照合し、不在 ID を除去、実在 ID が 0 の行を ❌ へ格下げした。詳細は末尾「訂正履歴」を参照。

## 1. サマリー

> 集計方針: `⚠️ 一部カバー` / `❌ 未カバー` は未カバーとして集計。HTTP APIエンドポイントは存在しないため、API観点は集計対象外。

| 観点 | カバー項目数 | 未カバー項目数 | カバレッジ率 |
|------|------------|--------------|------------|
| 受け入れ基準 | 15 | 0 | 100% |
| ドメインロジック | 17 | 1 | 94.4% |
| UseCase | 5 | 0 | 100% |
| **総合** | **37** | **1** | **97.4%** |

> **訂正（2026-07-15, WI-270）→ 昇格（2026-07-16, WI-276）**: 旧「総合 43/0 = 100%」は WI-270 で取消し（68.4%, 26/12）。WI-276 で実ソースと実テストを照合した結果、AC-PD-03/04/08/11/12/13 の 6 行と UseCase 全 5 行は「実テストは存在するが捏造 ID で引用され cross-reference が切れていた」ギャップであると判明。実在テストで裏付け直し（一部は WI-276 で実 API 準拠の確認テストを追加）、`@attestation` 付きで カバー印 へ昇格した。分子=カバー印 行数（AC 15 + domain 17 + UseCase 5 = 37）、分母=38（AC 15 + domain 18 + UseCase 5）。残 ❌ 1 行は domain の PhaseDependency「recommends はphase-gate失敗要因にしない」で、**公開 API に `recommends` エッジを注入する経路が存在しない**ため誠実な実テストが書けず ❌ を維持する（詳細は §3・末尾訂正履歴）。

### 判定結果
- カバー印 90%以上: テストロジック設計に進んで問題なし
- ⚠️ 70-90%: 未カバー項目の確認を推奨
- ❌ 70%未満: テストケース設計の追加が必要
- **本Unitの判定**: カバー印 97.4%（WI-276 昇格後）。実在し pass するテストと `@attestation` で裏付けた行のみ カバー印。旧レポートが「前回未カバー8項目を解消」と主張した `UT-PD-115〜133` / `IT-PD-088〜102` は 1 件も実在しないため、それらは引用せず、実在テスト（`UT-PD-007〜016 / 143〜146` 等の既存テスト + WI-276 追加の `UT-PD-200〜210` + 5 UseCase の実 unit テスト）で束縛し直した。残 ❌ は recommends-not-blocker 1 行のみ。

> **注記**: 実スイートは全て pass する（WI-276 後 `Tests 366 passed`）。WI-276 の カバー印 は捏造 `IT-PD-*` を一切引用せず、実在テストのみを根拠とし、L3-007 が matrix 上での story-id 実在性（testReferences>=1）を fail-closed で検証する。

## 2. 受け入れ基準カバレッジ詳細

| AC ID | 基準内容 | 対応テストケース | カバー状態 |
|------|---------|----------------|----------|
| AC-PD-01 | 3層フェーズ構造を定義し、各Levelのフェーズと成果物を保持できる | UT-PD-001〜003, UT-PD-019〜024 | ✅ カバー <!-- @attestation H02-01 --> |
| AC-PD-02 | Level 2前提なしのLevel 3開始をphase-gateが拒否する | UT-PD-010〜012 | ✅ カバー <!-- @attestation H02-01 --> |
| AC-PD-03 | Level内で上流設計なしの下流設計生成をphase-gateが拒否する | UT-PD-143〜146, UT-PD-202, UT-PD-203 | ✅ カバー <!-- @attestation H02-01 --> |
| AC-PD-04 | 設計文書・plan文書なしの実装コード変更をphase-gateが拒否する | UT-PD-007〜012, UT-PD-013〜016, UT-PD-200, UT-PD-201 | ✅ カバー <!-- @attestation H02-01 --> |
| AC-PD-05 | Level間依存の緩和不可を検証するテストが存在する | UT-PD-005, UT-PD-026, UT-PD-027 | ✅ カバー <!-- @attestation H02-01 --> |
| AC-PD-06 | `interactive` モードを定義し、その意味論を検証できる | UT-PD-013, UT-PD-014 | ✅ カバー <!-- @attestation H02-02 --> |
| AC-PD-07 | `embedded-qa` モードを定義し、その意味論を検証できる | UT-PD-015, UT-PD-016 | ✅ カバー <!-- @attestation H02-02 --> |
| AC-PD-08 | 両Planning Modeで `inception/` 配下の `*_plan.md` 成果物を前提に扱える | UT-PD-013〜016, UT-PD-204 | ✅ カバー <!-- @attestation H02-01 --> |
| AC-PD-09 | plan文書のファイル存在でPhase完了判定を検証する | UT-PD-007〜009 | ✅ カバー <!-- @attestation H02-02 --> |
| AC-PD-10 | plan文書にQAセクションが含まれることを検証する | UT-PD-013〜016 | ✅ カバー <!-- @attestation H02-02 --> |
| AC-PD-11 | `phasegate.config.json.phaseDependencies` を読み取り、意味論へ正規化できる | UT-PD-205, UT-PD-210（`harness-config-phase-config-provider.test.ts` の preset マッピングと併せて config→PhaseCustomizationPolicy 正規化を検証） | ✅ カバー <!-- @attestation H02-01 --> |
| AC-PD-12 | `customRules` による依存追加を適用できる | UT-PD-025, UT-PD-029〜031, UT-PD-206（`validate-customization-policy-usecase.test.ts` の追加依存検証と併せて） | ✅ カバー <!-- @attestation H02-01 --> |
| AC-PD-13 | デフォルト依存の削除には `override: true` を要求する | UT-PD-207, UT-PD-208, UT-PD-209 | ✅ カバー <!-- @attestation H02-01 --> |
| AC-PD-14 | `story-implementor` 前のテスト設計フェーズ存在は緩和不可である | UT-PD-028 | ✅ カバー <!-- @attestation H02-01 --> |
| AC-PD-15 | Level間依存（Level 2→1, Level 3→2）は緩和不可である | UT-PD-005, UT-PD-026, UT-PD-027 | ✅ カバー <!-- @attestation H02-01 --> |

> **AC 訂正（2026-07-15, WI-270）→ 昇格（2026-07-16, WI-276）**: 旧レポートが引用した `UT-PD-115〜126` / `IT-PD-088〜098` は 1 件も実在しない（WI-270 で ❌ 化）。WI-276 で実ソース照合の結果、AC-PD-03（UT-PD-143〜146）・AC-PD-04（UT-PD-007〜016）・AC-PD-08（UT-PD-013〜016）・AC-PD-12（UT-PD-025/029〜031）は既存の実在テストで既に実証されており、cross-reference のみが切れていたと判明。AC-PD-11 / AC-PD-13 は実 API 準拠の確認テストを WI-276 で追加（UT-PD-205/207〜210）。**設計文書 `unit_test_design.md` §8.4 が記した `OverrideRequiredError` は実ソースに存在しない**（実 API は override=false で `InvalidCustomRuleError`、非緩和依存で `NonRelaxableDependencyOverrideError` を送出）ため、テストは実 API に従っている。全昇格行に `@attestation H02-01` を付与し、L3-007 が matrix 実在性を検証する。

## 3. ドメインロジックカバレッジ詳細

### 集約

| 集約名 | 不変条件 | 対応テストケース | カバー状態 |
|------|---------|----------------|----------|
| PhaseStructure | INV-1: Level 2開始にはLevel 1成果物が全て必要 | UT-PD-007〜009 | ✅ カバー <!-- @attestation H02-01 --> |
| PhaseStructure | INV-2: Level 3開始にはLevel 2成果物が全て必要 | UT-PD-010〜012 | ✅ カバー <!-- @attestation H02-01 --> |
| PhaseStructure | INV-3: Level間依存は緩和不可 | UT-PD-025〜027 | ✅ カバー <!-- @attestation H02-01 --> |
| PhaseStructure | INV-4: `interactive` 時はQAセクション必須 | UT-PD-013, UT-PD-014 | ✅ カバー <!-- @attestation H02-01 --> |
| PhaseStructure | INV-5: `embedded-qa` 時はQ&A完了必須 | UT-PD-015, UT-PD-016 | ✅ カバー <!-- @attestation H02-01 --> |
| PhaseStructure | INV-6: `override: true` でもLevel間依存とTDD最低保証は緩和不可 | UT-PD-027〜029 | ✅ カバー <!-- @attestation H02-01 --> |
| PhaseStructure | INV-7: override適用時は監査ペイロードを返す | UT-PD-030, UT-PD-031 | ✅ カバー <!-- @attestation H02-01 --> |

### エンティティ

該当なし。`domain_model.md` ではエンティティを採用しておらず、`PlanDocument` は `PlanEvidence` 値オブジェクトへ降格されている。

### 値オブジェクト

| 値オブジェクト名 | 制約 | 対応テストケース | カバー状態 |
|------|------|----------------|----------|
| PhaseLevel | `1/2/3` のみ許可し、Level比較が正しく機能する | UT-PD-039〜046, UT-PD-089, UT-PD-092〜094 | ✅ カバー <!-- @attestation H02-01 --> |
| Artifact | 任意の相対パスを許可（WI-085: `docs/` 接頭辞撤廃）、許可外プレースホルダ（`{designDocsRoot}` / `{inceptionDocsRoot}` / `{unit}` / `{storyId}` 以外）禁止、`required=true` では未解決プレースホルダを禁止する | UT-PD-047〜053, UT-PD-095〜099, UT-PD-169〜177, IT-PD-126, IT-PD-127 | ✅ カバー <!-- @attestation H02-01 --> |
| PhaseNode | Level 3のstory scope必須成果物は `{storyId}` を含む | UT-PD-054〜059 | ✅ カバー <!-- @attestation H02-01 --> |
| PhaseDependency | 自己依存禁止、依存種別は `requires/recommends` のみ | UT-PD-062〜064 | ✅ カバー <!-- @attestation H02-01 --> |
| PhaseDependency | `recommends` はphase-gate失敗要因にしない | 実装テスト不能（後述） | ❌ 未カバー |
| PlanningMode | `interactive` はQAセクション存在を要求する | UT-PD-013, UT-PD-014 | ✅ カバー <!-- @attestation H02-01 --> |
| PlanningMode | `embedded-qa` はQA全回答を要求する | UT-PD-015, UT-PD-016 | ✅ カバー <!-- @attestation H02-01 --> |
| PlanEvidence | `exists=false` なら他属性もfalse、`planningModeMatch=true` なら `exists=true` | UT-PD-070〜074, UT-PD-103〜107 | ✅ カバー <!-- @attestation H02-01 --> |
| CustomRule | `targetPhase` 必須、`action` 1件以上、追加依存のみを表す | UT-PD-075〜078 | ✅ カバー <!-- @attestation H02-01 --> |
| PhaseCustomizationPolicy | `preset/rules/override` の意味論を保持し、`preset=default + rules` を追加依存として扱う | UT-PD-079〜083 | ✅ カバー <!-- @attestation H02-01 --> |
| PhaseGateResult | `passed=false` ならblockers必須、override時のみauditPayloadを保持する | UT-PD-084〜088 | ✅ カバー <!-- @attestation H02-01 --> |

> **ドメイン訂正（2026-07-15, WI-270）→ WI-276 で ❌ 維持を確認**: PhaseDependency「recommends はphase-gate失敗要因にしない」は唯一の根拠 `UT-PD-128〜129` / `IT-PD-099〜100` が不在のため WI-270 で ❌。WI-276 の実ソース調査で、この行は**誠実な実テストが書けない**ことが判明した: `checkPhaseGate` に recommends→warning（passed 不変）の分岐は実在する（`phase-structure.ts` L347/L369）が、`PhaseStructure` を構築する公開 API（`createDefault` / `fromGates` / `applyCustomization`）はいずれも生成する `PhaseDependency` の `type` を `'requires'` にハードコードしており、`recommends` エッジを `effectiveDependencies` に注入する経路が存在しない。default/standard/minimal/full の依存定義にも `recommends` は 1 件も無い。私有コンストラクタへの到達（カプセル化違反）やソース seam 追加はテスト追加 WI（WI-276, quick）のスコープ外のため、**テストを弱めて通すのではなく ❌ を誠実に維持**する。将来 seam を設ける story WI で解消する。他の VO 行は範囲引用に混在した不在 ID を除去し、実在 `UT-PD-*` の裏付けが残るため カバー印 を維持。

## 4. UseCaseカバレッジ詳細

> **訂正（2026-07-15, WI-270）→ 昇格（2026-07-16, WI-276）**: 旧レポートが引用した `IT-PD-001〜032` / `IT-PD-068〜102` の連番 ID は実テストツリーに 1 件も存在しない（WI-270 で ❌ 化）。WI-276 で実ソース照合の結果、**5 UseCase の実 unit テストはすべて存在し pass する**ことが判明した。旧レポートは実在テスト（`*-usecase.test.ts`）を引用せず捏造 `IT-PD-*` を引用していた（cross-reference の切断）。各行を実在テストで束縛し直し カバー印 へ昇格する。RecordPhaseOverrideAuditUseCase のテストは `@story` 注釈が欠落していたため WI-276 で `@story H02-03` を付与し matrix 可視化した。

| UseCase名 | 正常系 | 異常系 | カバー状態 |
|---------|------|------|----------|
| CheckPhaseGateUseCase | `check-phase-gate-usecase.test.ts` IT-PD-103/104/107（scope 転送・passed=true） | IT-PD-105（Level 3 成果物欠損で passed=false）, override 監査記録 | ✅ カバー <!-- @attestation H02-01 --> |
| BuildPhaseDependencyGraphUseCase | `build-phase-dependency-graph-usecase.test.ts`（includeArtifacts 有/無で DTO 生成） | — | ✅ カバー <!-- @attestation H02-01 --> |
| GetPhaseInfoUseCase | `get-phase-info-usecase.test.ts`（unit scope / story scope で currentLevel・completedNodes 算出） | — | ✅ カバー <!-- @attestation H02-01 --> |
| ValidateCustomizationPolicyUseCase | `validate-customization-policy-usecase.test.ts`（有効な追加依存ルールで valid=true） | 未知ノード参照を errors へ写像 / override 削除の警告写像 | ✅ カバー <!-- @attestation H02-03 --> |
| RecordPhaseOverrideAuditUseCase | `record-phase-override-audit-usecase.test.ts`（generatedAt 補完し監査ログへ転送） | 書き込み失敗を AuditLogWriteError として送出 | ✅ カバー <!-- @attestation H02-03 --> |

> 旧「HTTP APIエンドポイントは存在せず、外部境界はCLI/validatorとして IT-PD-068〜090 で検証されている」という記述は、`IT-PD-068〜090` が不在のため WI-270 で撤回済み。UseCase 層の検証は上表の application 層 unit テスト（domain port を test double で差し替え、domain モデルはモックしない）で担保される。

## 5. 未カバー項目一覧

### 優先度: 中（ドメインロジック）— WI-276 後の唯一の残 ❌

- **PhaseDependency「recommends はphase-gate失敗要因にしない」**: 実テスト不能。公開 API（`createDefault` / `fromGates` / `applyCustomization`）に `recommends` エッジを `PhaseStructure` へ注入する経路が無く、default/standard/minimal/full 定義にも `recommends` エッジが存在しないため、誠実な実テストが書けない。テストを弱めずに ❌ を維持（§3 訂正参照）。解消には source seam の追加（recommends を表現できる公開経路 or recommends を含む定義）が必要で、これは story WI のスコープ。

### 優先度: 低（網羅性向上）

- 実在する `IT-PD-103〜107` / `IT-PD-123〜130` のうち §4 に未引用のものは、より粒度の細かい UseCase 検証へ再束縛できる可能性がある。WI-276 では捏造を避けるため確認済みの範囲のみ束縛した。

## 6. 推奨追加ケース

- **残 1 行の解消**: recommends-not-blocker を実テスト可能にするための source seam（recommends を表現できる公開構築経路、または recommends を含む定義）を story WI で追加し、その上で recommends→warning かつ passed=true の実テストを追加する。
- 仕様追加時は `changedFiles`、`PlanningMode`、`override`、`recommends` の境界条件を優先的に再評価する。

## 7. 次のアクション

1. recommends-not-blocker（唯一の残 ❌）に対する source seam + 実テストを story WI で追加し カバー印 化する。
2. 実在する `IT-PD-103〜107` / `IT-PD-123〜130` の担保内容を確認し、適切な UseCase へさらに再束縛する。
3. L3-007（attestation 検証）で本レポートの カバー印 主張の回帰を fail-closed で防止する。

## WI-165: Coverage Refresh For WI-117..148

@work-item-id WI-165

Phase-dependency coverage remains focused on design order and phase gate scope. WI-117..148 reflection does not add new phase graph nodes; it adds downstream product evidence and setup lifecycle surfaces. Therefore this report considers the existing `changedFiles`, custom path, recommends, and override cases sufficient, and treats WI status freshness as validator-system `L2-014` rather than a phase-dependency rule.

## 訂正履歴

### 2026-07-16 — ❌ 12 行の実テスト裏付けと誠実な昇格（WI-276, quick, chore）

<!-- @work-item-id WI-276 -->

WI-270 が ❌（68.4%）へ格下げした 12 行を実ソース・実テストと突き合わせ、実在テストで裏付けられる 11 行を カバー印 へ昇格し、テスト不能な 1 行は ❌ を誠実に維持した。

**調査で判明した事実**: ❌ 12 行の大半は「実テストは存在するが、旧レポートが捏造 ID（`UT-PD-115〜133` / `IT-PD-*`）を引用したことで cross-reference が切れていた」ギャップであった（機能欠落ではない）。

**昇格した行（実 ID + `@attestation`）**:

1. **AC-PD-03 → カバー印**（UT-PD-143〜146 既存 + UT-PD-202/203 追加, @attestation H02-01）。Level 3 intra-level 上流設計欠損時の下流ブロックを実証。
2. **AC-PD-04 → カバー印**（UT-PD-007〜016 既存 + UT-PD-200/201 追加, @attestation H02-01）。前提成果物・plan・QA 欠損時のブロックを実証。
3. **AC-PD-08 → カバー印**（UT-PD-013〜016 既存 + UT-PD-204 追加, @attestation H02-01）。interactive/embedded-qa 両モードの plan 成果物前提を実証。
4. **AC-PD-11 → カバー印**（UT-PD-205/210 追加 + config-provider preset マッピング, @attestation H02-01）。config.customization → PhaseCustomizationPolicy 正規化（rules→CustomRule、overrideEnabled 保持/デフォルト）を実証。
5. **AC-PD-12 → カバー印**（UT-PD-025/029〜031 既存 + UT-PD-206 追加, @attestation H02-01）。customRules による依存追加（既定依存維持）を実証。
6. **AC-PD-13 → カバー印**（UT-PD-207/208/209 追加, @attestation H02-01）。override=false で `InvalidCustomRuleError`、override=true で緩和可能依存の削除成功+監査ペイロード、override=true でも Level 間依存削除は `NonRelaxableDependencyOverrideError`。**設計文書 §8.4 の `OverrideRequiredError` は実ソースに存在しないため、実 API に従った**。
7. **§4 UseCase 全 5 種 → カバー印**（各 `*-usecase.test.ts`, @attestation H02-01 / H02-03）。5 UseCase の実 unit テストは全て存在し pass。`record-phase-override-audit-usecase.test.ts` は `@story` 欠落だったため WI-276 で `@story H02-03` + `@unit` を付与し matrix 可視化。

**❌ を維持した行（テスト不能・誠実な残置）**:

- **domain: PhaseDependency「recommends はphase-gate失敗要因にしない」**。`checkPhaseGate` の recommends→warning 分岐（passed 不変）は実在するが、公開 API（createDefault / fromGates / applyCustomization）が生成する依存は全て `type: 'requires'` であり、`recommends` エッジを `effectiveDependencies` へ注入する経路が存在しない。既定定義にも recommends は皆無。私有コンストラクタ直叩き（カプセル化違反）やソース seam 追加はテスト追加 WI（quick, chore）のスコープ外のため、テストを弱めず ❌ を維持。

**追加テスト**: `phase-structure.test.ts` に UT-PD-200〜209（AC-PD-03/04/08/12/13）、`harness-config-phase-config-provider.test.ts` に UT-PD-205/210（AC-PD-11）を追加。捏造範囲 115〜133 は再利用せず、既存最大（177）と重複しない 200 番台を採番した。全て実 API 準拠・AAA・日本語テスト名・ドメインモデルのモック無し。

**headline**: 68.4%（26/12）→ **97.4%（37/1）**。分子=AC 15 + domain 17 + UseCase 5 = 37、分母=38。

**実スイート結果（verbatim・exit 0, WI-276 後）**: `Test Files 44 passed (44) / Tests 366 passed (366)`（phase-dependency-model スコープ。追加前 354 → 追加後 366、+12）。

### 2026-07-15 — 反ロンダリング実態訂正（WI-270, quick, fix）

<!-- @work-item-id WI-270 -->

WI-267 が実テスト再検証で確定させた laundering の実態訂正。全 cited ID を `grep -rlF "<ID>" scripts/harness/__tests__/` で照合した。

実在テストのインベントリ（正本・実 grep）: **UT-PD は 001〜114 の範囲（欠番あり、最大 177 だが 115〜133 は不在）**、**IT-PD は 103〜107 / 123〜130 の範囲のみ実在**（IT-PD-001〜102 は 1 件も存在しない）。

除去した虚偽引用と格下げ:

1. **§1 サマリー / 判定「カバー印 100%（43/0）」→ ❌ 68.4%（26/12）**。
2. **§2 AC-PD-03/04/08/11/12/13 → ❌**。旧「前回未カバー解消」の根拠 `UT-PD-115〜133` / `IT-PD-088〜102` が全て不在。
3. **§3 PhaseDependency「recommends はphase-gate失敗要因にしない」→ ❌**。根拠 `UT-PD-128〜129` / `IT-PD-099〜100` が不在。
4. **§4 UseCase 全 5 種 → ❌**。引用された `IT-PD-001〜032` / `IT-PD-068〜102` が 1 件も実在しない。「外部境界を IT-PD-068〜090 で検証」の記述も撤回。
5. その他の カバー印 行から、範囲引用に混在した不在 ID を除去し、実在 `UT-PD-*` / `IT-PD-103〜107,123〜130` の裏付けが残る行のみ カバー印 を維持。

実スイート結果（verbatim・exit 0）: `Test Files 42 passed (42) / Tests 347 passed (347)`。実在テストは全て pass しており、上記 ❌ はフィーチャ欠落ではなく実テスト未実装のギャップである。

**ungated-legacy マーカーは維持**（attestation 発行機構が未実装のため。WI-267 §5 の結論に従う）。カバー印 を新規追加していない。テストコードは一切変更していない。
