# Wave 1 ドメインモデル設計計画 — codexレビュー

## 総合評価

Wave 1の6ユニットは、責務分離の方向性自体は概ね妥当です。特に `config-foundation` を品質設定に絞り、`adr-foundation` と `harness-error` をShared Kernel/契約起点の基盤として先行定義する判断は、Wave 2以降の並列開発に有利です。

一方で、Phase 2に進む前に解消すべき設計上の揺れが3つあります。第1に、トレーサビリティのID体系が `HXX-XX` / `@story-id` と `US-XXX` / `@US-XXX` の間で不整合です。第2に、レイヤー名が `application/infrastructure/presentation` と `port/usecase/controller` の間で揺れており、`biome-ast-engine` と `traceability-model` の基礎語彙が未固定です。第3に、`LintExecution`、`TraceabilityChain`、`PlanDocument`、`HarnessError` のような「永続的整合性境界を持たない概念」が集約候補として持ち上がっており、DDDとしては過剰モデリングの兆候があります。

結論として、現状は「方向性は良いが、契約の正規形を先に固定すべき」段階です。集約は減らし、Shared Kernelは最小化し、契約語彙は単一化するのが妥当です。

## Unit別レビュー

### 1. biome-ast-engine

#### 集約境界

`BiomeRule` をルール定義の中心概念として置く方針は妥当ですが、`enabled` / `severity` / 適用パターンまでこのUnitが所有すると `HarnessConfigV2` と責務が衝突します。biome-ast-engine が所有すべきなのは「ルール定義と評価ロジック」であり、「設定状態」は config-foundation から供給されるべきです。

`LintExecution` は現時点では集約としては重いです。CIやCLIの一回実行は整合性境界というより処理フローであり、永続化された履歴や再実行制御を持たないなら、`LintRunner` のようなドメインサービスと `LintReport` 値オブジェクトで十分です。

`ImportGraph` はサービスではなく、不変の解析結果モデルとして扱う方が自然です。構築は `ImportGraphBuilder` の責務、グラフ自体は値オブジェクト、という分離がよいです。

#### 値オブジェクト vs 集約

`RuleViolation`、`LintReport`、`LayerBoundary` を値オブジェクトとみなす判断は妥当です。逆に `LintExecution` は集約から降格させるのがよく、`BiomeRule` も「状態を持つエンティティ」ではなく「識別可能なルール定義エンティティ」か、場合によっては不変なルール仕様値オブジェクト群として整理できます。

特に `BiomeRule` の同一性を `RuleName` に置くなら、可変なのは実装詳細ではなく外部設定に依存する有効状態です。このため、ドメイン中心のモデルとしては「RuleDefinitionは不変」「有効状態は設定から注入」が一番破綻しにくいです。

#### Shared Kernel整合性

`RuleViolation -> HarnessError` 変換をアダプターに置く方針は適切です。ただし `LayerBoundary` が依拠するレイヤー語彙は、現状の契約だと `application/infrastructure/presentation` と `port/usecase/controller` で揺れているため、先に正規語彙を固定しないと `no-layer-violation` が安定しません。

`FilePath` はこのUnitでも現れますが、現状の6ユニットで意味論が同一ではありません。Shared Kernelに上げるなら `ProjectRelativePath` のような最小意味に限るべきで、各Unit固有の `AdrFilePath` や `ConfigFilePath` は局所値オブジェクトに留めるのが安全です。

#### v0変更点

`AntiPatternDetector` を統合して「AST解析エンジン」に責務を寄せる簡素化は妥当です。Hook/CI設定を別Unitへ移したのも境界が明確になります。

ただし、v0で外部スクリプトだった `no-code-duplication` と `no-ghost-file` まで「Biomeルールの一種」として同一視しすぎると、実装方式の差がドメインに漏れます。v0との差分としては、「集約削減」は良いが、「検出方式の多態性」は保持すべきです。

#### QA回答提案

- Q1: 8ルール個別管理を基本にしてよいですが、厳密には「8個の集約」ではなく「不変なRuleDefinitionのレジストリ」を推奨します。二択ならRuleCatalog集約より個別管理の方が変更影響を局所化できます。
- Q2: RuleTypeで抽象化する方針に同意します。ただし `BiomeNative | RustPlugin | ExternalAnalyzer` のように、Biome外実装も表現できる名前にした方が v0差分を正しく吸収できます。
- Q3: 反対です。現段階の `LintExecution` は集約よりドメインサービスが自然です。必要なのはライフサイクル管理より「実行結果の一貫した生成」であり、`LintReport` を不変値として返す設計で足ります。

### 2. phase-dependency-model

#### 集約境界

`PhaseStructure` を単一集約にする判断は妥当です。Level間依存はまさに1つの整合性境界であり、これをLevel別集約に分けると最重要制約がドメインサービスへ流出します。

一方で `PhaseDependencyCustomization` を独立集約にするのはやや重いです。永続化の実体は `HarnessConfigV2.phaseDependencies` であり、このUnitが所有すべきなのは「カスタマイズ設定の意味論と妥当性」です。したがって、`PhaseCustomizationPolicy` のような値オブジェクトまたはポリシーモデルとして `PhaseStructure` に適用される形の方が責務が明確です。

`PlanDocument` も独立エンティティより「Phase完了を示す証跡」と見る方が自然です。ファイルパス同一性より、存在・QA充足・フェーズ種別との対応が本質です。

#### 値オブジェクト vs 集約

`PhaseLevel`、`PhaseNode`、`PhaseDependency`、`Artifact` を値オブジェクトとして扱うのは妥当です。`PlanDocument` はエンティティまで上げず、`PlanEvidence` ないし `PlanDocumentSnapshot` のような値オブジェクトに降格するのがDDDとして自然です。

理由は、この概念が独自ライフサイクルを持たず、常に「ファイルシステム上の状態の読み取り結果」として扱われるからです。エンティティにすると、ファイル実体とモデルの二重管理になりやすいです。

#### Shared Kernel整合性

`phaseDependencies` のシリアライズ構造は config-foundation 所有、そこから読み取った制約の意味論は本Unit所有、という切り分けにすべきです。この境界を明文化しないと、設定スキーマ変更時に両Unitで制約定義が重複します。

`PlanningMode` を `harness-api` に返す以上、型の正規定義もこのUnitかShared Kernelに固定した方がよいです。現状の説明だと config-foundation、phase-dependency-model、harness-api の3箇所に同概念が散る余地があります。

#### v0変更点

新規ユニットとして切り出した判断は妥当です。v0で暗黙だった phase gate を「構造モデル」として昇格させたのは、v1の3層構造に必要な抽象化です。

ただし、カスタマイズ設定の所有権が config-foundation にある点を踏まえると、「モデル」と「設定」を混ぜないことが重要です。ここを曖昧にすると v1の責務分離メリットが薄れます。

#### QA回答提案

- Q1: 推奨案に同意します。Level間依存が本Unitの中核不変条件なので、`PhaseStructure` は単一集約が妥当です。
- Q2: 代替案を推奨します。`PlanDocument` は独立エンティティより `PhaseNode` が持つ証跡値オブジェクトにした方が自然です。QA検証ロジックが複雑でも、複雑さは値オブジェクトや仕様オブジェクトで十分表現できます。
- Q3: 方向性には同意しますが、Wave 1で本格的なドメインイベント基盤は不要です。`DependencyOverrideApplied` 相当の監査ペイロードをドメインから返し、アプリケーション層でログ化する構成が実装コストに見合います。

### 3. traceability-model

#### 集約境界

このUnitの最大の論点は、`TraceabilityChain` を本当に集約として扱う必要があるかです。実装ファイルから逆引きで導出されるチェーンは、永続的整合性境界というより「検証対象のスナップショット」に近く、DDD的にはリッチな値オブジェクトまたは仕様オブジェクトが自然です。

さらに、チェーンの各リンクは `product/`、`inception/`、テストファイル、実装ファイルという別々の所有物に跨っています。これらを1集約が「所有する」モデルにすると、所有権境界が崩れます。L2で担保するのはリンク整合性であり、集約管理ではありません。

#### 値オブジェクト vs 集約

`MetadataTag`、`UnitReference`、`LayerReference`、`StoryReference`、`ChainLink` は値オブジェクトで問題ありません。`TraceabilityChain` も集約より、`FilePath` 起点の不変チェーン値とみなす方が適切です。

`StoryId` 自体はShared Kernel候補の値オブジェクトですが、v0→v1のマッピング表まで持たせるのは責務過多です。ID値そのものと、旧ID別名解決は分けるべきです。

#### Shared Kernel整合性

ここは現状で重大な不整合があります。計画書は `HXX-XX` / `@story-id` を正規としていますが、現行の `product/user_stories.md` と `product/harness_product_overview.md` には `@US-XXX` / `// @story US-XXX` が多数残っています。Shared Kernelとしての `StoryId` を本Unitが所有すること自体は正しいですが、まず正規表記を1つに固定しないと実装不能です。

また `@story` の検証責務も、計画ではL2 metadata、統合契約ではL3 nyquist寄りの説明が混在しています。L2で「存在と書式」まで、L3で「要件との被覆関係」まで、のように責務を分けるのが妥当です。

#### v0変更点

v0からの新規追加としては妥当です。`@unit/@layer` の存在強制から一歩進めて、実装→設計→計画までの逆引きチェーンをモデル化しようとしている点は v1らしい拡張です。

ただし、L2で全チェーンを厳密検証しすぎると L4 drift-detect / consistency 系の責務と重複します。v1変更として妥当なのは「L2は直接リンクの整合性、L4は全体の網羅的健全性」という責務分割です。

#### QA回答提案

- Q1: 二択ならファイル単位に同意しますが、厳密には集約ではなくファイル起点の不変 `TraceabilityChain` 値オブジェクトを推奨します。全体検証は `MetadataValidator` / `TraceabilityResolver` の責務に置くのが自然です。
- Q2: 推奨案Cには反対です。`@story-id が0個` を初回判定に使うと、単なる付与漏れを初回作成と誤認します。`git diff` の追加/更新種別を入力にするか、設計文書側に明示フラグを置く方が堅牢です。
- Q3: 反対です。v0マッピング表を `StoryId` 値オブジェクト内部に持たせるべきではありません。`StoryIdAliasResolver` もしくは `user_stories.md` から構築される参照サービスに分離するのが妥当です。

### 4. config-foundation

#### 集約境界

`HarnessConfig` を単一集約にする判断は妥当です。設定のI/O単位がファイル全体であり、整合性もセクション横断で評価されるためです。

一方で `FeatureRegistry` は集約や中核ドメインオブジェクトではなく、外部レジストリを統合するサービスかACLに近いです。ここをドメインの中心に置きすぎると、validator-system 依存が config-foundation に逆流します。

#### 値オブジェクト vs 集約

`Preset`、`LayerConfig`、`QuickModeConfig`、`PhaseDependenciesConfig`、`PlanningModeConfig`、`FeatureToggle` を値オブジェクトで扱う整理は妥当です。`HarnessConfig` はファイルパス同一性を持つエンティティとして扱えますが、外部公開するのは不変DTOとしての `HarnessConfigV2` に寄せた方がよいです。

プリセット解決はドメインサービスでもファクトリ内部でも成立しますが、重要なのは「生JSON」と「解決済み設定」を区別することです。利用側に見せるのは常に解決済み設定に揃えるのがよいです。

#### Shared Kernel整合性

`HarnessConfigV2` をShared Kernelとして先行確定する方針は正しいです。ただし、深いマージ規則、配列の上書き規則、未指定時のデフォルト解決順序まで契約に落とさないと、各Unitが異なる前提で解釈する恐れがあります。

また `phaseDependencies` や `planningMode` は本Unitが「型」を持っていても、意味論の所有者は phase-dependency-model 側です。Shared Kernelで公開するのは構造まで、意味の不変条件は元Unitに残すのがよいです。

#### v0変更点

v0から orchestration/session/migration を外に出し、品質設定のSingle Source of Truthに絞った判断は妥当です。これは責務縮小ではなく、境界の純化です。

環境変数オーバーライドを外す判断も、品質ハーネスの決定論を守る観点では合理的です。もし将来必要になっても、品質ドメインの外側で適用されるべきです。

#### QA回答提案

- Q1: 推奨案に同意します。Presetは deep merge が妥当です。ただし配列は結合ではなく置換とし、プリセット展開後に最終バリデーションを実行する契約まで明文化すべきです。
- Q2: 推奨案に同意します。`FeatureRegistry` はPort越しに段階実装し、Wave 1では `harnesses` キー中心、Wave 2で `Validator ID Registry` を合流させるのがよいです。
- Q3: 推奨案に同意します。環境変数オーバーライドはこのUnitから外すべきです。品質設定のSource of Truthを1つに保つ方が設計意図に合致します。

### 5. adr-foundation

#### 集約境界

`ADR` を唯一の集約とする設計は妥当です。番号、フロントマター、本文、状態遷移が自然な整合性境界を形成しています。

`ArchgateMapping` を別集約にせず `ADR` の内部値オブジェクトとして持たせる方針も妥当です。強制ルールはADRの付帯メタデータであり、独立ライフサイクルを持つ主対象ではありません。

#### 値オブジェクト vs 集約

`AdrId`、`AdrStatus`、`AdrFrontmatter`、`AdrBody`、`SupersededByRef` は値オブジェクトとして妥当です。`ArchgateMapping` も同様で問題ありません。

注意点は、`ArchgateMapping` が将来「逆引き検索の中心」になるなら、それでも集約昇格ではなく read model 生成で対応する方が自然だという点です。基底の真実はADRファイルに残すべきです。

#### Shared Kernel整合性

ADRフロントマタースキーマを本Unitが所有し、`harness-error` や `ci-governance` が参照する構図は正しいです。特に `adr_ref` の解決先が機械可読になる点は基盤価値があります。

ただし `adr_ref` の表記規約は厳密に固定すべきです。`ADR-001` なのか `001` なのかが揺れると Shared Kernelとして使えません。frontmatter上の `adr_id` と外部参照表記の対応も明文化が必要です。

#### v0変更点

v0 adr-documentation をほぼ踏襲しつつ `archgate` を追加する方針は妥当です。追加差分が小さいため、v0知見を再利用しやすい設計です。

v1で新しいプロダクトとして採番をリセットする判断も整合的です。外部参照としてv0 ADRを扱う設計なら、体系を混ぜない方がよいです。

#### QA回答提案

- Q1: 推奨案に同意します。`archgate` はADRフロントマターに埋め込むのが真実の所在として自然です。必要なら逆引き用の `archgate-registry` は生成物として持つのがよいです。
- Q2: 推奨案に同意します。v1は別プロダクトとして `001` 開始が妥当です。v0参照が必要なら `AIDLC ADR-xxx` のように体系を明示的に分離すべきです。

### 6. harness-error

#### 集約境界

このUnitは、集約よりShared Kernel値オブジェクトの設計が本質です。`HarnessError` は不変で、値で比較され、永続化された整合性境界を持ちません。したがって、集約ルートとして扱うより「ファクトリ付きリッチ値オブジェクト」とするのがDDDとして妥当です。

一方で `code -> severity -> adr_ref要件` のような生成規則には所有者が必要です。ここは `ErrorDefinitionRegistry` ないし `HarnessErrorFactory` が担うべきで、`HarnessError` 自身は生成後不変の結果値に留めるのがよいです。

#### 値オブジェクト vs 集約

`HarnessError` を値オブジェクトに降格させるべきです。`ErrorCode`、`Severity`、`FixExample`、`AdrRef` を値オブジェクトとするのは妥当です。

`FixExampleValidationResult` も値オブジェクトで問題ありません。逆に、もし昇格させるべき概念があるとすれば、それは `HarnessError` 本体ではなく「エラー定義カタログ」です。各コードの severity、ADR参照要件、fix_example要件を持つ定義群は、Shared Kernelの安定性を支える中心概念になりえます。

#### Shared Kernel整合性

`HarnessError` を全Unit共有契約にする設計は非常に良いです。ただし、現在の文書群ではエラーコード表記が `L2-PHASE-GATE` と `L2-001` のように揺れており、ここは実装前に統一が必要です。

また `fix_example` 検証のために `HarnessConfigV2` や validator 実装へ依存するのは、`HarnessError` 型そのものではなく検証サービス側だけに限定すべきです。Shared Kernel本体は最小限に保つのがよいです。

#### v0変更点

新規ユニットとして切り出した判断は妥当です。v0で散在していたエラー表現を統一し、自己修正のための `fix_example` を契約化するのは、v1の差別化要素になっています。

ただし、コア型に「自己修正品質保証」まで持ち込みすぎると肥大化します。v1の妥当な着地点は「型は最小、検証サービスは別」です。

#### QA回答提案

- Q1: 推奨案に同意します。`HarnessError` は集約ではなく、`HarnessErrorFactory` を伴うリッチ値オブジェクトが最適です。
- Q2: 推奨案に同意します。`FixExampleValidator` はポートとして定義し、実際のバリデータ実行はInfrastructureに委譲すべきです。
- Q3: 方向性には同意しますが、`sequence` より `identifier` と表現した方が安全です。将来 `L2-001` と `L2-PHASE-GATE` のどちらも許す余地を残すためです。ただし実装前に正規形式は1つに統一すべきです。

## 横断的指摘事項

最優先の論点は、Story ID体系とメタデータ記法の不整合です。`traceability-model` と `integration_contract` の一部は `HXX-XX` / `@story-id` に寄っていますが、`product_overview` と `user_stories` には `@US-XXX` / `// @story US-XXX` がまだ多く残っています。これはShared Kernelの根幹なので、どちらを正とするかを先に決める必要があります。

次に、レイヤー語彙の正規化が必要です。`application/infrastructure/presentation` と `port/usecase/controller` は別の関心軸であり、同じ `@layer` に混在させるべきではありません。`traceability-model` の `LayerReference` と `biome-ast-engine` の `LayerBoundary` は、同じ語彙表を参照しなければなりません。

また、Wave 1の複数計画で「集約」という語が広く使われていますが、実際には検証スナップショットや処理フローを指しているケースがあります。CLI/Validator系ドメインでは、集約は少なく、値オブジェクトとドメインサービスが中心になる方が自然です。

最後に、Shared Kernelを増やしすぎない方がよいです。`HarnessError` と `HarnessConfigV2` はShared Kernelに相応しい一方、`FilePath` のような一見共通に見える概念は文脈差が大きいです。共有するなら意味を削ぎ落とした最小型に限定すべきです。

## 推奨アクション

1. Story IDの正規形式を `HXX-XX` か `US-XXX` のどちらかに統一し、`product_overview`、`integration_contract`、`user_stories`、`traceability-model` を一括修正する。
2. `@story-id`、`@US-XXX`、`// @story` の責務分担と書式を固定し、L2 metadata と L3 nyquist の検証境界を明文化する。
3. `@layer` の正規語彙を1つに固定し、`biome-ast-engine` の `LayerBoundary` と `traceability-model` の `LayerReference` をその語彙表に従わせる。
4. `LintExecution`、`TraceabilityChain`、`PlanDocument`、`HarnessError` を集約候補から再評価し、値オブジェクトまたはドメインサービスへ降格する。
5. `phaseDependencies`、`planningMode`、`FeatureRegistry` について、config-foundation が所有するのは「設定構造」、各Unitが所有するのは「意味論」であることを契約に明記する。
6. `HarnessError.code` の正規形式を固定し、`L2-001` 系で行くのか、意味名コードを許容するのかを実装前に決める。
7. Shared Kernel候補を棚卸しし、`HarnessError`、`HarnessConfigV2`、`StoryId` 以外は原則ローカル値オブジェクトとして扱う方針を確定する。
