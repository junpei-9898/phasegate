# Wave 1 ドメインモデル設計計画 フォローアップ

## 結論

基本的にこの解決方針に同意します。特に、集約の削減、Shared Kernel の最小化、`config-foundation` と各 Unit の責務分離は妥当です。

ただし、**Phase 2 に進む前に横断契約として先に固定すべきもの**があります。

1. Story ID 正規形式
2. `@layer` 正規語彙
3. ErrorCode 正規形式
4. `architecture-philosophy.md` / `integration_contract` / metadata 検証責務の同期

これらを plan 個別更新より先に揃えるのが安全です。

## 項目別フィードバック

### 1. Story ID体系

**同意。**

- `HXX-XX` を v1 正規形式に固定する方針は妥当です。
- `user_stories.md` の旧 `US` フィールド保持も移行期間の互換策として妥当です。
- 修正案として、旧 `US` は **deprecated / read-only / 廃止時期未定** を明記してください。
- L2 は「存在・書式・参照解決」、L3 は「被覆関係・要件追跡」に分ける整理で問題ありません。

### 2. レイヤー語彙

**同意。**

- v1 の正規語彙を `domain / application / infrastructure / presentation` に固定するのは妥当です。
- `port / usecase / controller` はレイヤー語彙ではなく、役割や実装パターンの語として分離してください。
- 修正案として、`architecture-philosophy.md` は Phase 2 前に更新した方がよいです。ここが古いままだと plan 側だけ直しても再度揺れます。
- `LayerBoundary` と `LayerReference` が同一語彙表を参照する方針に異論はありません。

### 3. 集約の再評価

**概ね同意。**

- `LintExecution`、`TraceabilityChain`、`PlanDocument`、`HarnessError` の降格は妥当です。
- `BiomeRule` を不変 `RuleDefinition` + 設定注入にする整理も妥当です。
- `PhaseDependencyCustomization` の降格も問題ありません。
- 補足として、`HarnessErrorFactory` だけでなく **ErrorDefinitionRegistry 相当の定義所有者** を持たせると、code/severity/adr_ref の対応がぶれにくくなります。

### 4. ErrorCode正規形式

**同意。ただし補助導線は必要です。**

- `L{n}-{nnn}` 形式への統一は機械可読性の観点で妥当です。
- 意味名コードを捨てる判断にも賛成です。
- 修正案として、人間可読性を `message` のみに寄せるのではなく、**コード一覧表に短い title / category を持たせる** 方が運用しやすいです。

### 5. Shared Kernel最小化

**同意。**

- `HarnessError` 型、`HarnessConfigV2` 型、`StoryId` 値オブジェクトに絞るのは適切です。
- `FilePath` を局所化する方針も妥当です。
- `ProjectRelativePath` を共通化するなら、**構文的な最小型に限定し、意味論を載せない** ことを条件に賛成です。
- `StoryIdAliasResolver` を `StoryId` 本体から分離する判断にも同意します。

### 6. config-foundation vs 各Unitの所有権

**同意。**

- `config-foundation` が構造、各 Unit が意味論・不変条件を持つ整理は明確です。
- `FeatureRegistry` を ACL 的ドメインサービスとして置くのも妥当です。
- 修正案として、`phaseDependencies` や `planningMode` のような横断概念は、**構造の定義元** と **意味論の定義元** を契約上で明記してください。

## 最終判断

この方針で各 plan を更新してよいです。ただし順序は次の方が安全です。

1. 横断契約を更新する
2. 各 Unit plan を更新する
3. Phase 2 に進む

特に `Story ID`、`@layer`、`ErrorCode` を未確定のまま plan 更新を始めると、各 Unit で再び表記ゆれが入るので避けた方がよいです。
