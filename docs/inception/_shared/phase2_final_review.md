# Wave 1 Phase 2 最終レビュー

## 対象

- `docs/product/construction/harness-error/domain_model.md`
- `docs/product/construction/biome-ast-engine/domain_model.md`
- `docs/product/construction/config-foundation/domain_model.md`
- `docs/product/construction/phase-dependency-model/domain_model.md`
- `docs/product/construction/traceability-model/domain_model.md`
- `docs/product/construction/adr-foundation/domain_model.md`

併せて以下を整合性確認に使用した。

- `docs/inception/_shared/cross_cutting_decisions.md`
- `docs/product/units/integration_contract.md`
- `docs/inception/_shared/phase2_pre_review.md`
- `docs/product/user_stories.md`

## 結論

**承認不可。**

6ユニットの集約境界、Shared Kernelの大枠、Archive Carry-over Exclusionsの方向性は概ね妥当です。特に以下は事前レビューから改善されています。

- `biome-ast-engine` の `RuleDefinition` が値オブジェクトに修正された
- `traceability-model` の `StoryIdAliasResolver` が `StoryCatalogPort` 経由に整理された
- `config-foundation` のスキーマ検証が `ConfigSchemaValidatorPort` に分離された
- `user_stories.md` 側の `@story-id HXX-XX` / `// @story HXX-XX` への更新は解消済み
- `integration_contract.md` 先頭の `HarnessError` 例は `L2-PHASE-GATE` から `L2-001` 系へ修正済み

ただし、統合契約との差分とモデル図の不正確さがまだ残っています。

## 指摘事項

### 1. `config-foundation` が所有する `HarnessConfigV2` 契約とドメインモデルが一致していない

- 統合契約の `HarnessConfigV2` は `project / layers / quickMode / phaseDependencies / planningMode / harnesses / paths / reporting` を持つ
  - `docs/product/units/integration_contract.md:47-77`
- しかし `config-foundation` のクラス図は `paths` と `reporting` を欠落させ、さらに各セクションの形も契約とズレています。
  - `QuickModeConfig.enabled` が追加されている
  - `PhaseDependenciesConfig` が `preset/override/customRules` ではなく `levels` になっている
  - `PlanningModeConfig` が `default/perPhase` ではなく単一 `mode` になっている
  - `HarnessesConfig` が個別キーではなく `entries` になっている
  - `docs/product/construction/config-foundation/domain_model.md:188-295`

**判断**: `HarnessConfigV2` の定義元Unitとしては未整合です。Shared Kernelの Single Source of Truth が成立していません。

### 2. `integration_contract.md` の metadata 契約に旧 `@US-XXX` が残っており、事前レビュー指摘が未完了

- `traceability-model` 本体は `@story-id HXX-XX` / `// @story HXX-XX` に統一できています。
  - `docs/product/construction/traceability-model/domain_model.md:17-27`
  - `docs/product/construction/traceability-model/domain_model.md:114-120`
- `user_stories.md` も該当箇所は修正済みです。
  - `docs/product/user_stories.md:202-238`
  - `docs/product/user_stories.md:504-518`
  - `docs/product/user_stories.md:984-998`
- しかし統合契約の validator 一覧だけがまだ `@unit/@layer/@US-XXX/@story` のままです。
  - `docs/product/units/integration_contract.md:391-395`

**判断**: `phase2_pre_review.md` の「旧 `@US-XXX` 残存」は部分解消に留まっています。6ユニットのドメインモデル自体は揃いましたが、基準契約が1箇所だけ古いため最終承認にできません。

### 3. `adr-foundation` の Frontmatter 定義が統合契約スキーマと食い違っている

- 統合契約の ADR Frontmatter Schema は `title / status / date / superseded_by` のみです。
  - `docs/product/units/integration_contract.md:170-179`
- 一方、`adr-foundation` は `adr_id` と `archgate` を Frontmatter に含めるモデルとして定義しています。
  - `docs/product/construction/adr-foundation/domain_model.md:20-24`
  - `docs/product/construction/adr-foundation/domain_model.md:83-87`
  - `docs/product/construction/adr-foundation/domain_model.md:229-250`

**判断**: owner unit のモデルと公開契約のどちらが正なのかが決まっていません。`archgate` を正式スキーマへ昇格するか、domain model 側から外すかの整理が必要です。

### 4. Mermaid クラス図に未定義型・仮置き型が多く、図が正確な設計表現になっていない

- `biome-ast-engine` は `Severity` と `L1Config` を図中で使っていますが、当該Unitの所有概念にも Shared Kernel にも定義していません。
  - `docs/product/construction/biome-ast-engine/domain_model.md:175-181`
  - `docs/product/construction/biome-ast-engine/domain_model.md:197-205`
  - `docs/product/construction/biome-ast-engine/domain_model.md:252-281`
- `config-foundation` は `ProjectConfig`, `LayersConfig`, `HarnessConfigV2`, `PresetDefaults`, `PhaseNodeConfig`, `HarnessEntry`, `Config`, `RawConfig`, `ValidationResult` を未定義のまま使用しています。
  - `docs/product/construction/config-foundation/domain_model.md:192-280`
- `phase-dependency-model` は `AuditPayload` を未定義のまま使っています。
  - `docs/product/construction/phase-dependency-model/domain_model.md:225-230`
- `traceability-model` は `FilePath`, `HarnessError`, `ValidationContext` を未定義のまま使っています。
  - `docs/product/construction/traceability-model/domain_model.md:202-208`
  - `docs/product/construction/traceability-model/domain_model.md:249-258`
  - `docs/product/construction/traceability-model/domain_model.md:270-295`
- `adr-foundation` は `EnforcementEntry` と `ValidationResult` を未定義のまま使っています。
  - `docs/product/construction/adr-foundation/domain_model.md:246-265`

**判断**: レビュー観点 6 の「Mermaidクラス図の正確性」は未達です。少なくとも、図に出す型はその文書内で定義するか、外部契約型として明示参照に統一してください。

### 5. `harness-error` の不変条件に `fixExampleRequired` の強制が抜けている

- `ErrorDefinition` は `fixExampleRequired` を持つモデルとして定義されています。
  - `docs/product/construction/harness-error/domain_model.md:81`
  - `docs/product/construction/harness-error/domain_model.md:207-215`
- しかし不変条件は「fix_example が指定された場合の構文妥当性」しか定義しておらず、「必須コードで fix_example が欠落してはいけない」がありません。
  - `docs/product/construction/harness-error/domain_model.md:106-112`

**判断**: review 観点 7 の「不変条件の網羅性」が不足しています。AI自己修正を契約化するなら、`fixExampleRequired=true` のときの必須制約を明記すべきです。

## 観点別まとめ

| 観点 | 判定 | コメント |
|------|------|----------|
| 1. 横断契約との整合性 | 概ね良好 | 集約境界・Shared Kernel最小化・Story ID方針は概ね一致 |
| 2. 統合契約との整合性 | 要修正 | `config-foundation` と `adr-foundation` が契約と不一致。`integration_contract.md` に旧 `@US-XXX` も残存 |
| 3. 6ユニット間の矛盾・冗長性・命名 | 概ね良好 | ただし Mermaid 内の未定義型が hidden contract を生んでいる |
| 4. Shared Kernel利用表 | 概ね良好 | `HarnessError` / `HarnessConfigV2` / `StoryId` の3点に収まっている。だが `biome-ast-engine` 図中の `Severity` は hidden shared type に見える |
| 5. Port境界 | 概ね妥当 | 事前レビューで懸念した `StoryCatalogPort` 化と schema validator port 化は解消 |
| 6. Mermaidクラス図 | 不十分 | 未定義型が多く、正確な図になっていない |
| 7. 不変条件 | 一部不足 | `harness-error` の `fixExampleRequired` 制約が抜けている |
| 8. Archive Carry-over Exclusions | 妥当 | 降格/非採用の整理は適切 |
| 9. 事前レビュー指摘の解消 | 部分解消 | `user_stories.md` は解消、`integration_contract.md:394` は未解消 |

## 再レビュー条件

以下が反映されたら再レビューで承認可能です。

1. `config-foundation` を `HarnessConfigV2` 契約と一致させる
2. `integration_contract.md:394` の `@US-XXX` を `@story-id HXX-XX` ベースへ修正する
3. `adr-foundation` と ADR Frontmatter Schema の差分を解消する
4. Mermaid 図の未定義型を除去または明示定義する
5. `harness-error` に `fixExampleRequired` の不変条件を追加する

## 再レビュー結果

## 結論

**承認不可。**

5項目中4項目は解消済みです。ただし、Mermaid図の未定義型問題が完全には解消していないため、最終承認には至りません。

## 確認結果

### 1. `config-foundation`: `HarnessConfigV2` と統合契約の整合

**解消済み。**

- `paths` と `reporting` が追加されている
  - `docs/product/construction/config-foundation/domain_model.md:210-211`
  - `docs/product/units/integration_contract.md:75-76`
- `quickMode / phaseDependencies / planningMode / harnesses` の構造は統合契約の型定義に一致している
  - `docs/product/construction/config-foundation/domain_model.md:263-300`
  - `docs/product/units/integration_contract.md:55-76`

### 2. `integration_contract.md:394`: `@US-XXX` → `@story-id`

**解消済み。**

- L2 metadata の契約記述は `@unit/@layer/@story-id/@story` に更新されている
  - `docs/product/units/integration_contract.md:399`
- 指定対象ファイル群で `@US-XXX` の残存は確認されなかった

### 3. `adr-foundation`: ADR Frontmatter Schema の整合

**解消済み。**

- 統合契約側に `adr_id` と `archgate` が追加されている
  - `docs/product/units/integration_contract.md:174-182`
- `adr-foundation` 側の `AdrFrontmatter` 定義とも一致している
  - `docs/product/construction/adr-foundation/domain_model.md:83-85`
  - `docs/product/construction/adr-foundation/domain_model.md:229-236`

### 4. Mermaid図の未定義型修正

**未解消。**

前回指摘した `Severity`, `L1Config`, `AuditPayload`, `EnforcementEntry`, `ValidationResult`, `ValidationContext` は解消され、外部参照型への `External` 注釈も追加されています。ただし、`config-foundation` のクラス図に未定義型がまだ残っています。

- `HarnessConfig.getLayerConfig()` の戻り値 `LayerConfig` が図中で未定義
  - `docs/product/construction/config-foundation/domain_model.md:214`
- `PhaseDependenciesConfig.customRules` の要素型 `CustomRuleEntry` が図中で未定義
  - `docs/product/construction/config-foundation/domain_model.md:274`

このため、「Mermaid図の未定義型を除去または明示定義する」という前回指摘は完了とは判断できません。

### 5. `harness-error`: `fixExampleRequired=true` 時の `fix_example` 必須制約

**解消済み。**

- 不変条件 `INV-7` として追加されている
  - `docs/product/construction/harness-error/domain_model.md:112`

全項目解消、承認
