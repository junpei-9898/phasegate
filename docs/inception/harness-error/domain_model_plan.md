# ドメインモデル設計計画: harness-error

## 1. スコープ

- **対象Unit**: harness-error（H-06 HarnessError体系）
- **担当ストーリー**: H06-01（統一フォーマット+全バリデータ適用）, H06-02（fix_example品質保証）, H06-03（severity権限契約）
- **他Unitとの境界**:
  - 全Unit: HarnessError型をShared Kernelとして提供
  - adr-foundation: adr_refフィールドの参照先ADRの実在性検証
  - validator-system: Validator ID Registryを消費（fix_example検証対象）
  - config-foundation: fix_example検証時にバリデータ実行のための設定参照
  - harness-api: severity権限契約をAPIレスポンスで維持

## 2. 集約候補の分析

### ストーリーから抽出した業務名詞

| 名詞 | 出現ストーリー | 分類 |
|------|-------------|------|
| HarnessError | H06-01 | 値オブジェクト — **Shared Kernel**（リッチファクトリ付き不変値オブジェクト） |
| ErrorCode | H06-01 | 値オブジェクト（L{n}-{nnn}形式。横断契約§3準拠） |
| Severity | H06-01, H06-03 | 値オブジェクト（error/warning + read-only契約） |
| FixExample | H06-01, H06-02 | 値オブジェクト（修正コード例 + 構文妥当性検証） |
| AdrRef | H06-01 | 値オブジェクト（ADR参照。ADR-{nnn}形式） |
| FixExampleValidationResult | H06-02 | 値オブジェクト（fix_example検証結果） |

### 集約・サービスの構成

**集約なし** — HarnessErrorは不変値オブジェクトであり、集約として扱う必要がない。

- **HarnessErrorFactory**（ドメインサービス）: HarnessError値オブジェクトの生成。生成時のバリデーション（ErrorCodeフォーマット検証、adr_ref実在性検証、fix_example構文妥当性検証、code→severity対応の妥当性）を集約
- **ErrorDefinitionRegistry**（ドメインサービス）: 各ErrorCodeに対するtitle/category/defaultSeverity/adrRef要件の定義を管理。code→severity→adr_refの対応がぶれないことを保証
- **FixExampleValidator**（ドメインサービス / Portインターフェース）: 「fix_example適用後にバリデータが通過する」ことを検証。ドメインモデルではインターフェースのみ定義し、実際のバリデータ呼び出しはInfrastructure層アダプターが担当
- **SeverityContractEnforcer**（ドメインサービス）: severity格下げ検出。HarnessErrorの生成後にseverityを変更しようとする操作をコンパイル時（readonly）+ランタイム（Object.freeze）で防止

### v0からの変更点（新規Unit）

- HarnessError集約候補 → リッチ値オブジェクト + HarnessErrorFactoryに変更
- ErrorDefinitionRegistry追加: code/severity/adr_refの対応を一元管理
- ErrorCode正規形式: `L{n}-{nnn}`に統一（意味名コード廃止。横断契約§3）

## 3. 設計方針

- **HarnessErrorは値オブジェクト**: 生成後不変、値等価性で比較、IDによる識別なし。集約ルートにすると不自然にリポジトリ（永続化）の概念が導入されるため値オブジェクトが最適
- **ErrorCodeの体系**: `L{n}-{nnn}`形式に統一（横断契約§3）。人間可読性はErrorDefinitionRegistryのtitle/category属性で補完
- **ErrorDefinitionRegistry**: 各コードの定義（title, category, defaultSeverity, adrRef要件, fix_example要件）を管理。Shared Kernelの安定性を支える中心概念
- **FixExampleの品質保証**: FixExampleValidatorはPortインターフェース。CI統合はApplication層から
- **SeverityContract**: severity格下げ防止はTypeScriptのreadonly修飾子+Object.freeze()の二重防御
- **Shared Kernelとしての安定性**: HarnessError型のインターフェースはWave 1開始前に確定。追加的変更（新フィールド追加）のみ許容、既存フィールドの変更・削除は禁止

## 4. QA（不明点・確認事項）

### [Question] Q1: HarnessErrorは集約か値オブジェクトか

HarnessErrorは生成後不変であり、IDによる識別ではなく値の等価性で比較される。

**決定**: リッチなファクトリ付き値オブジェクト。HarnessErrorFactoryをドメインサービスとして切り出し、生成時のバリデーションロジックを集約。ErrorDefinitionRegistryがcode/severity/adr_refの対応を管理。

[Answer] codexレビュー合意: 集約ではなくファクトリ付きリッチ値オブジェクトが最適。エラー定義カタログ（ErrorDefinitionRegistry）が中心概念。

### [Question] Q2: fix_example検証の実行タイミング

fix_exampleの「適用後にバリデータが通過する」検証はCIで実行するが、ドメインモデル内でこの検証をどこまで表現するか？

**決定**: ドメインモデルではFixExampleValidator（Portインターフェース）のみ定義。実際のバリデータ呼び出しはInfrastructure層アダプターが担当。CI統合はApplication層から。

[Answer] codexレビュー合意: ポートとして定義し、実際の実行はInfrastructureに委譲。

### [Question] Q3: ErrorCodeの拡張性

L1-001〜L4-003の既存コードに加えて、将来L0-xxx（fuse-hooks-engine）やL4-004〜（phase2-extensions）が追加される。

**決定**: ErrorCode値オブジェクトは`layer: L0〜L4` + `sequence: nnn`のペアで表現。正規形式は`L{n}-{nnn}`に統一（横断契約§3）。連番の上限は制約しない。

[Answer] codexレビュー合意: `L{n}-{nnn}`形式への統一が妥当。人間可読性はErrorDefinitionRegistryのtitle/categoryで補完。

## 5. 前提条件・リスク

- **型定義の先行確定**: HarnessError型はWave 1開始前に確定が必要（全Unit並列開発の前提）
- **fix_example品質の継続保証**: バリデータ実装の変更でfix_exampleが陳腐化するリスク。CI検証で防止
- **severity契約の破壊リスク**: harness-api等のUnit実装でseverityが意図せず変更されるリスク。型レベル+ランタイムの二重防御
- **ErrorDefinitionRegistryの安定性**: code→severity→adr_refの対応変更は全Unitに波及
