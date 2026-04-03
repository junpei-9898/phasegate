# Wave 1 Phase 2 事前レビュー

## 対象

- `docs/inception/_shared/cross_cutting_decisions.md`
- `docs/inception/biome-ast-engine/domain_model_plan.md`
- `docs/inception/phase-dependency-model/domain_model_plan.md`
- `docs/inception/traceability-model/domain_model_plan.md`
- `docs/inception/config-foundation/domain_model_plan.md`
- `docs/inception/adr-foundation/domain_model_plan.md`
- `docs/inception/harness-error/domain_model_plan.md`
- `docs/product/units/integration_contract.md`
- `docs/product/user_stories.md`
- `docs/product/archive/construction/config_foundation/domain_model.md`
- `docs/product/archive/construction/adr_documentation/domain_model.md`
- `docs/product/archive/construction/biome_toolchain/domain_model.md`

## 結論

Wave 1 の6ユニットについて、集約境界の大枠は妥当です。`phase-dependency-model`、`config-foundation`、`adr-foundation` を集約あり、`biome-ast-engine`、`traceability-model`、`harness-error` を集約なしとする判断は、横断決定とも整合しています。

一方で、Phase 2 着手前に必ず解消すべき横断矛盾が2件あります。

1. ErrorCode の意味名コードが統合契約に残存している
2. Story ID / メタデータ記法の旧 `US-XXX` / `@US-XXX` が複数文書に残存している

この2件を放置すると、Shared Kernel を前提にした実装が Unit ごとに分岐します。

## 重大指摘

### 1. HarnessError の code 例に `L2-PHASE-GATE` が残っている

- 横断決定では ErrorCode 正規形式を `L{n}-{nnn}` に統一し、意味名コードは廃止済みです。
  - `docs/inception/_shared/cross_cutting_decisions.md:47-49`
- それにもかかわらず統合契約の `HarnessError` 定義例に `L2-PHASE-GATE` が残っています。
  - `docs/product/units/integration_contract.md:32-39`
- 同じ統合契約の validator ID 一覧では `phase-gate` は `L2-001` と定義されています。
  - `docs/product/units/integration_contract.md:391-395`

**判断**: これは明確な矛盾です。`harness-error` の `ErrorDefinitionRegistry` と `integration_contract` のどちらを真実の所在にするかが実装時にぶれます。Phase 2 前に統合契約の例を `L2-001` ベースへ修正すべきです。

### 2. `user_stories.md` に旧 `US-XXX` / `@US-XXX` が残っている

- 横断決定では Story ID 正規形式を `HXX-XX` に統一し、設計文書は `@story-id HXX-XX`、テストは `// @story HXX-XX` と定義しています。
  - `docs/inception/_shared/cross_cutting_decisions.md:13-23`
- traceability-model の計画もこの前提で組まれています。
  - `docs/inception/traceability-model/domain_model_plan.md:21-26`
  - `docs/inception/traceability-model/domain_model_plan.md:47-50`
- しかし `user_stories.md` では以下が旧記法のままです。
  - `docs/product/user_stories.md:198` `K3.5（@unit/@layer/@US-XXXメタデータ）`
  - `docs/product/user_stories.md:202-218` `H03-02` が `@US-XXX` 前提
  - `docs/product/user_stories.md:229-238` `H03-03` が `// @story US-XXX` / `@US-XXX` / `inception/{unit}/{US-XXX}/` 前提
  - `docs/product/user_stories.md:504-518` `phasegate:impact-analysis US-XXX`
  - `docs/product/user_stories.md:984-998` `@US-XXX` 自動付与
- 統合契約にも旧記法が残っています。
  - `docs/product/units/integration_contract.md:394`

**判断**: これは traceability-model / nyquist-validation / Cascade Updater / impact-analysis の入力仕様を壊すレベルの矛盾です。Phase 2 前に `@story-id HXX-XX`、`// @story HXX-XX`、`HXX-XX` CLI 引数表記へ統一する必要があります。

## 観点別レビュー

### 1. ユニット間の矛盾

**評価**: 一部ブロッカーあり。

- 6ユニットの計画同士は概ね整合しています。
  - Shared Kernel は `HarnessError` / `HarnessConfigV2` / `StoryId` の3つに限定されている
  - レイヤー語彙は `domain/application/infrastructure/presentation` に統一されている
  - 3集約 / 3集約なしの整理も横断決定と一致している
- ただし、実際の参照元である `integration_contract.md` と `user_stories.md` が古い語彙を残しており、計画と契約が食い違っています。
- アーカイブ由来の古い語彙も残っています。
  - `docs/product/archive/construction/biome_toolchain/domain_model.md:219-229` は `port/usecase/controller`
  - `docs/product/archive/construction/adr_documentation/domain_model.md:224-225` は `harness-dx` 参照

**結論**: 計画よりも契約文書側の更新が先です。

### 2. 冗長性

**評価**: 概ね良好。1点だけ将来の重複リスクあり。

- `FilePath` の重複定義は問題ありません。横断決定で「各Unit内ローカル値オブジェクト」と明示されています。
  - `docs/inception/_shared/cross_cutting_decisions.md:76-82`
- `RuleDefinitionRegistry`、`ErrorDefinitionRegistry`、`FeatureRegistry` は責務が重なっておらず、現時点では冗長ではありません。
- ただし `StoryIdAliasResolver` が `user_stories.md` から直接マッピングを構築する前提は、今後 `impact-analysis` や Nyquist 側で別の Markdown 解析実装を生みやすいです。
  - `docs/inception/traceability-model/domain_model_plan.md:35`
  - `docs/inception/traceability-model/domain_model_plan.md:75`

**推奨**: Story ID 一覧の読み出しは `StoryCatalog` もしくは `StoryIndex` の Port に寄せ、Markdown パースを1箇所に閉じ込めるべきです。

### 3. 命名の不統一

**評価**: 軽微だが早めに揃えたい。

- `HarnessConfig` 集約と `HarnessConfigV2` 共有DTOの名前が近く、実装時に混同しやすいです。
  - `docs/inception/config-foundation/domain_model_plan.md:19`
  - `docs/inception/config-foundation/domain_model_plan.md:49`
- `AdrFrontmatter` とアーカイブ側 `AdrFrontMatter` で表記揺れがあります。
  - `docs/inception/adr-foundation/domain_model_plan.md:21`
  - `docs/product/archive/construction/adr_documentation/domain_model.md` の `AdrFrontMatter` 表記
- `@story-id` / `@story` に揃える方針と、`@US-XXX` / `US-XXX` 表記が混在しています。これは軽微ではなく仕様不整合です。

**推奨**:

- 共有DTOは `HarnessConfigV2`、集約は `HarnessConfigAggregate` など役割で分ける
- `AdrFrontmatter` / `AdrFrontMatter` はどちらかに統一する
- Story 系メタデータは `@story-id` / `@story` のみを正規表記にする

### 4. Shared Kernel整合性

**評価**: 6ユニットの計画上は整合。契約定義の型の弱さが残る。

- `HarnessError`
  - 所有: `harness-error`
  - 供給対象: 全Unit
  - 値オブジェクトとして統一
- `HarnessConfigV2`
  - 所有: `config-foundation`
  - 構造のみを管理し、意味論は他Unitに委譲
- `StoryId`
  - 所有: `traceability-model`
  - 別名解決は `StoryIdAliasResolver` に分離

これ自体は整っています。

ただし統合契約では `HarnessError.code` が単なる `string`、`RequirementTestMatrix.storyId` も単なる `string` で、Shared Kernel を型として固定し切れていません。

**推奨**: Phase 2 では共有型スニペットを文書内に重複記載せず、`HarnessError` / `HarnessConfigV2` / `StoryId` の正規型定義を1箇所に固定し、各Unit設計書はそれを参照する形に寄せるべきです。

### 5. 集約境界の妥当性

**評価**: 妥当。

- 集約あり
  - `phase-dependency-model`: `PhaseStructure`
  - `config-foundation`: `HarnessConfig`
  - `adr-foundation`: `ADR`
- 集約なし
  - `biome-ast-engine`
  - `traceability-model`
  - `harness-error`

この分け方は、横断決定の「維持する集約」「降格対象」と一致しています。
`docs/inception/_shared/cross_cutting_decisions.md:101-115`

特に良い点:

- `PhaseStructure` を単一集約にしたことで Level 間制約がサービスへ流出していない
- `HarnessError` を集約化せず、永続化不要の不変値に留めている
- `TraceabilityChain` を検証スナップショットとして VO に落とした

注意点:

- `config-foundation` は archive の `OrchestrationConfig` / `SessionConfig` / `EnvironmentOverride` を戻し始めると再び肥大化します。
  - `docs/product/archive/construction/config_foundation/domain_model.md:20-38`
  - `docs/product/archive/construction/config_foundation/domain_model.md:55-57`

### 6. ドメインサービスの責務過多

**評価**: 2箇所で境界を明確化したほうがよい。

- `StoryIdAliasResolver`
  - 問題: `user_stories.md` からのマッピング構築まで担うと、ドメインサービスが Markdown 永続化形式に依存します。
  - 対応: `StoryCatalogPort` を介して alias map を受け取る形にする
- `ConfigValidationService`
  - 問題: `ajv` など JSON Schema エンジンへの依存はドメインより Application / Infrastructure 寄りです。
  - 根拠: `docs/inception/config-foundation/domain_model_plan.md:46`
  - 対応: スキーマ適合は外側で判定し、ドメインは「Preset解決後の不変条件」に集中させる

`HarnessErrorFactory` は現時点では許容範囲です。ただし将来ここにファイルI/OやCI実行を足し込むと肥大化するため、`ErrorDefinitionRegistry` / `FixExampleValidator` / 実体生成を分離したまま維持したほうが安全です。

### 7. 値オブジェクト vs エンティティの判断

**評価**: 大半は妥当。`RuleDefinition` だけ再判定推奨。

妥当な判断:

- `HarnessError` を VO
- `TraceabilityChain` を VO
- `PlanEvidence` を VO
- `PhaseCustomizationPolicy` を VO
- `ArchgateMapping` を VO

再判定したい点:

- `RuleDefinition` が「不変エンティティ」とされている
  - `docs/inception/biome-ast-engine/domain_model_plan.md:19`
  - `docs/inception/biome-ast-engine/domain_model_plan.md:62`
- ルール定義が完全に不変で、同一性が `RuleName` の値一致だけなら、VO のほうが自然です。
- 将来 `RuleDefinition` に独立ライフサイクルや versioning を持たせる予定がない限り、Entity より VO のほうが実装も説明も簡潔です。

**推奨**: `RuleDefinition` を VO に寄せるか、「なぜ Entity なのか」を明文化すること。

### 8. HarnessError型定義の `L2-PHASE-GATE` 残存

**評価**: ブロッカー。

- 横断決定: `L2-PHASE-GATE` 廃止
  - `docs/inception/_shared/cross_cutting_decisions.md:47-49`
- 統合契約: 残存
  - `docs/product/units/integration_contract.md:32-39`

**必要対応**: `HarnessError` の例示、関連説明、サンプル出力例をすべて `L2-001` 形式へ修正すること。

### 9. `user_stories.md` に `@US-XXX` が残っている

**評価**: ブロッカー。

- 横断決定: `US-XXX` は deprecated / read-only
  - `docs/inception/_shared/cross_cutting_decisions.md:13-16`
- `user_stories.md`:
  - `docs/product/user_stories.md:202-218`
  - `docs/product/user_stories.md:229-238`
  - `docs/product/user_stories.md:504-518`
  - `docs/product/user_stories.md:984-998`
- 統合契約:
  - `docs/product/units/integration_contract.md:394`

**必要対応**:

- `@US-XXX` → `@story-id HXX-XX`
- `// @story US-XXX` → `// @story HXX-XX`
- `inception/{unit}/{US-XXX}/` → `inception/{unit}/{HXX-XX}/`
- CLI 仕様 `US-XXX` → `HXX-XX`

### 10. Phase 2 ドメインモデル作成時の構造推奨

以下の章立てを全Unitで固定することを推奨します。

1. **Ownership / Import-Export**
   - このUnitが所有する概念
   - 他Unitから受け取る Shared Kernel
   - 他Unitへ公開する契約
2. **Aggregate Boundary**
   - 集約あり/なしの結論
   - なぜその境界なのか
   - 集約に入れない概念
3. **Model Classification**
   - Entity / Value Object / Domain Service / Policy / Port を表で分類
   - 各概念に「なぜその分類か」を1行で添える
4. **Invariants**
   - 集約不変条件
   - Shared Kernel に対する前提条件
5. **Port Boundary**
   - Markdown/JSON/FS/CLI/validator 実行のどれが Port 越しかを明示する
6. **Archive Carry-over Exclusions**
   - v0/archive から継承しない概念を表で固定化する
   - 例: `LintExecution`, `AntiPatternDetector`, `EnvironmentOverride`, `harness-dx`
7. **Open Questions**
   - 論理設計へ持ち越す点だけを残す

最低限、各Unitの Phase 2 ドメインモデルには次の2つを追加したほうがよいです。

- `Shared Kernel利用表`
  - `型名 / 所有Unit / 自Unitでの扱い / 変更可否`
- `継承しない旧概念表`
  - `旧概念 / 旧出典 / 今回採用しない理由 / 置換先`

## Phase 2 着手条件

以下が満たされれば、Wave 1 のドメインモデル作成に進めます。

1. `integration_contract.md` から意味名 ErrorCode を除去する
2. `user_stories.md` と `integration_contract.md` の Story ID / メタデータ表記を `HXX-XX` 系へ統一する
3. `RuleDefinition` の Entity / VO 判定を最終化する
4. `StoryIdAliasResolver` と `ConfigValidationService` の Port 境界を明記する
5. archive の古い語彙を Phase 2 成果物へ持ち込まないことを明文化する
