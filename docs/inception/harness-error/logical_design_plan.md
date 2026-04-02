# 論理設計計画: harness-error

> **Unit ID**: harness-error
> **作成日**: 2026-03-13
> **Wave**: 1（基盤構築）
> **モード**: 横断（Unit全体の論理設計）
> **対応ストーリー**: H06-01, H06-02, H06-03

---

## 1. スコープ

### 対象ストーリー

| Story ID | タイトル | 本計画で扱う主題 |
|----------|---------|------------------|
| H06-01 | HarnessError統一フォーマット + 全バリデータへの適用 | Shared KernelとしてのHarnessError契約、全バリデータ出力の正規化、`adr_ref`/`fix_example`付与 |
| H06-02 | fix_example品質保証 | fix_exampleの構文妥当性検証、適用後にバリデータが通過することの検証フロー |
| H06-03 | severity権限契約 | `severity: "error"`格下げ禁止、readonly契約、違反検出 |

### 対象層

| 層 | 対象 | 理由 |
|----|------|------|
| Domain | 対象 | HarnessError/ErrorCode/Severity等の値オブジェクト、ErrorDefinitionRegistry、SeverityContractEnforcerを定義する中心層 |
| Application | 対象 | HarnessError生成、全バリデータ結果の正規化、fix_example検証、severity契約確認を調停する |
| Infrastructure | 対象 | ADR実在性確認、fix_example品質検証、既存validator/legacy error reporterとの接続を担う |
| Presentation | 原則対象外 | 本UnitはUI/CLIの所有者ではない。外部公開はShared Kernelの型エクスポートを主とし、専用Presentation層はPhase 1では新設しない |

### スコープ境界

- `HarnessError` は Shared Kernel として **全Unit に公開する最小契約** のみを外部に露出する
- `ErrorDefinitionRegistry`、`SeverityContractEnforcer`、`FixExampleValidatorPort` の所有権は harness-error に置く
- `harness-api` の Response DTO や各 validator の実行ロジック自体は本Unitの所有外とし、harness-error は契約と正規化機構を提供する
- 既存の [`scripts/harness/core/error-reporter.ts`](/Users/jumpei/dev/ALIDL_HARNESS/phasegate/scripts/harness/core/error-reporter.ts) は移行対象とし、Phase 1 では canonical source にしない

---

## 2. 設計方針

### 2.1 アーキテクチャ層定義

v1正規語彙に従い、`domain / application / infrastructure / presentation` の4層で整理する。`port / usecase / controller` は実装パターン名として使用してよいが、`@layer`タグや論理層名には使わない。

依存方向は横断契約どおり以下に固定する。

```text
domain <- application <- infrastructure
domain <- application <- presentation
```

- Domain層は外部I/Oに依存しない
- Application層はユースケースの調停役に徹し、ドメインルールを持ち込まない
- Infrastructure層は Port 実装と既存コードとの接続を担当する
- Presentation層は本Unitでは原則持たず、外部公開は Shared Kernel エクスポートに限定する

### 2.2 技術スタック

| 項目 | 方針 |
|------|------|
| 言語 | TypeScript（既存 `tsconfig.json` の strict 前提を維持） |
| 実行基盤 | Node.js ESM + `tsx` |
| テスト | Vitest |
| パッケージ管理 | pnpm |
| 構文妥当性検証 | TypeScript Compiler API を第一候補とし、fix_example を文字列ではなく「検証済みコード片」として扱う |
| 既存validator連携 | `scripts/harness/validators/*.ts` を Infrastructure adapter 経由で利用 |

### 2.3 ディレクトリ構造方針

現行の `scripts/harness` 配下に段階導入し、既存構成を破壊せずに unit 境界を明確化する。

```text
scripts/harness/
├── shared-kernel/
│   └── harness-error.ts
└── harness-error/
    ├── domain/
    │   ├── value-objects/
    │   ├── services/
    │   └── ports/
    ├── application/
    │   ├── usecases/
    │   └── dto/
    └── infrastructure/
        ├── adapters/
        ├── registry/
        └── legacy/
```

- `shared-kernel/harness-error.ts` を **他Unit向け唯一の公開入口** とする
- `harness-error/domain` には内部用のリッチな値オブジェクトを置き、他Unitへは露出しない
- `infrastructure/legacy` に現行 [`scripts/harness/core/error-reporter.ts`](/Users/jumpei/dev/ALIDL_HARNESS/phasegate/scripts/harness/core/error-reporter.ts) や validator 固有出力との互換アダプターを置く

### 2.4 重要な設計上の判断

- Shared Kernel の `HarnessError` は **外部向けには平坦な readonly DTO** とし、内部では `ErrorCode` や `Severity` などの値オブジェクトで表現する
- 現行 `error-reporter` の `severity: "info"` は v1 契約外であるため、canonical contract には含めない
- `ErrorDefinitionRegistry` は code ごとの定義カタログであり、ランタイムで変更させない不変レジストリとして扱う
- `severity` の防御は `readonly` と `Object.freeze()` の二段構えにし、さらに `SeverityContractEnforcer` で格下げ試行を検出する

---

## 3. 層別設計の計画

### 3.1 Domain層

#### 型シグネチャ方針

- **内部モデル**
  - `HarnessError`: `code: ErrorCode`, `severity: Severity`, `message: string`, `suggestion: string`, `adrRef?: AdrRef`, `fixExample?: FixExample`
  - すべて不変オブジェクトとし、生成後に `Object.freeze()` を適用する
  - `equals()` または同等の値比較メソッドを持つ
- **外部公開契約**
  - Shared Kernelでは `Readonly<{ code: string; severity: "error" | "warning"; message: string; suggestion: string; adr_ref?: string; fix_example?: string; }>` を公開する
  - 内部 VO を外部に漏らさず、application 層で DTO へ投影する

#### 主要値オブジェクト

| 値オブジェクト | 役割 | 主な不変条件 |
|---------------|------|--------------|
| `ErrorCode` | `L{n}-{nnn}`形式のエラー識別子 | 横断契約 §3 準拠、`L0`〜`L4`のみ許容 |
| `Severity` | 重大度 | `"error"` / `"warning"` のみ許容、比較演算を提供 |
| `FixExample` | 修正コード例 | 空文字禁止、構文妥当性検証済みのみ生成可 |
| `AdrRef` | ADR参照 | `ADR-{nnn}` 形式、外部Portで実在確認 |
| `ErrorDefinition` | code単位の契約定義 | `defaultSeverity`、`title`、`category`、必須属性を保持 |
| `FixExampleValidationResult` | fix_example品質検証結果 | pass/fail と失敗理由を保持 |

#### ドメインサービス

| サービス | 責務 |
|---------|------|
| `HarnessErrorFactory` | ErrorDefinitionRegistry参照、Port呼び出し前提の前提条件確認、HarnessError生成 |
| `ErrorDefinitionRegistry` | code→定義の対応管理、既定severity/カテゴリ/ADR要件/fix_example要件の一元化 |
| `SeverityContractEnforcer` | 要求severityと既定severityを比較し、格下げを拒否 |

#### ErrorDefinitionRegistry の設計

- 実体は **不変のインメモリカタログ** とする
- 1レコードは少なくとも以下を持つ
  - `code`
  - `title`
  - `category`
  - `defaultSeverity`
  - `adrRefRequired`
  - `fixExampleRequired`
  - `defaultAdrRef?`
  - `ownerValidatorId`
- 役割は「人間可読性補完」と「契約の真実の源泉」の両方
- validator 側に severity や ADR 必須性を分散定義させず、registry を参照して統一する

### 3.2 Application層

| ユースケース | 主責務 | 対応ストーリー |
|-------------|--------|---------------|
| `CreateHarnessErrorUseCase` | validator から渡された raw input を正規化し、Shared Kernel DTO を返す | H06-01 |
| `NormalizeValidatorErrorsUseCase` | L1-L4 各validatorの出力差異を吸収し、HarnessError配列へ変換する | H06-01 |
| `ValidateFixExampleUseCase` | 単一 error definition の fix_example を検証する | H06-02 |
| `ValidateAllFixExamplesUseCase` | registry 全件または validator 単位で fix_example を一括検証する | H06-02 |
| `AssertSeverityContractUseCase` | orchestration 層や API DTO 生成時の severity 格下げを検出する | H06-03 |
| `ListErrorDefinitionsUseCase` | code一覧、カテゴリ一覧、validator別定義一覧を返し、他UnitやCIの参照点にする | H06-01, H06-02 |

補足:

- Application層は DTO の入出力境界を担い、Domain層の VO を外部へ返さない
- fix_example の CI 統合は `ValidateAllFixExamplesUseCase` を起点に行う
- 既存 validator 移行期間は `NormalizeValidatorErrorsUseCase` が legacy 形式を吸収する

### 3.3 Infrastructure層

| アダプター | 実装対象 | 役割 |
|-----------|---------|------|
| `FileSystemAdrExistenceCheckerAdapter` | `AdrExistenceCheckerPort` | `docs/ADR/` の ADR 実在確認 |
| `ValidatorExecutionFixExampleValidatorAdapter` | `FixExampleValidatorPort` | fix_example適用後に対象validatorを実行し、通過可否を返す |
| `TypeScriptSnippetSyntaxAdapter` | `FixExampleValidatorPort` の内部協力要素 | fix_example の構文妥当性を事前検証する |
| `LegacyErrorReporterAdapter` | 既存 error reporter 互換 | 旧 `HarnessError` 形状から canonical DTO への移行吸収 |
| `ValidatorRegistryBridgeAdapter` | validator 実行連携 | validator ID と実行エントリポイントの対応を application 層へ提供 |
| `ErrorDefinitionRegistrySource` | registry 初期化 | 定義カタログのロード元をコード/設定ファイルのいずれにも差し替え可能にする |

#### Presentation層

Phase 1では専用Presentation層は持たない。理由は以下のとおり。

- 本Unitは CLI コマンドを所有しない
- 公開責務の中心は Shared Kernel 型エクスポートであり、UI/HTTP/CLI フォーマット変換は他Unit責務
- ただし `shared-kernel/harness-error.ts` は公開ファサードとして機能するため、実装上は「薄い公開境界」として扱う

---

## 4. ポートインターフェース一覧（Domain層内に定義）

| ポート | 主要メソッド案 | 用途 |
|--------|---------------|------|
| `FixExampleValidatorPort` | `validate(input: { validatorId: string; errorCode: ErrorCode; fixExample: FixExample }): Promise<FixExampleValidationResult>` | fix_exampleの品質検証。構文妥当性と「適用後にvalidatorが通過すること」の検証結果を返す |
| `AdrExistenceCheckerPort` | `exists(adrRef: AdrRef): Promise<boolean>` | `adr_ref` の参照先 ADR の実在確認 |

方針:

- Port はすべて Domain層に置き、Infrastructure が実装する
- validator 実行やファイルシステム参照を Domain へ持ち込まない
- Port の戻り値は Domain が理解できる値オブジェクトまたはプリミティブに限定する

---

## 5. Shared Kernel公開戦略

### 5.1 公開物

- 公開するのは以下に限定する
  - `HarnessError` readonly 契約
  - `HarnessErrorSeverity` 型エイリアス（`"error" | "warning"`）
  - 必要最小限の生成補助関数または type guard

### 5.2 公開経路

- canonical export path を `scripts/harness/shared-kernel/harness-error.ts` に固定する
- 他Unitは registry や内部 VO を参照せず、上記ファイルのみ import する
- `scripts/harness/core/error-reporter.ts` には canonical type を再エクスポートさせず、段階的に adapter 経由へ寄せる

### 5.3 互換性方針

- 既存フィールドの削除・改名・意味変更は禁止
- 許容する変更は add-only（新規 optional field の追加）のみ
- `severity` は `"error" | "warning"` に固定し、`"info"` は Shared Kernel に入れない
- 内部モデル変更があっても、公開 DTO の形は integration contract と一致させる

### 5.4 他Unitへの公開方法

- validator 系 Unit: `HarnessError` を直接返す
- harness-api: `HarnessApiResponse.errors[]` の要素型としてそのまま採用する
- ci-governance / regression-suite: JSON出力の共通 contract として利用する
- 付随メタデータ（title/category/defaultSeverity など）は Shared Kernel へ出さず、harness-error Unit 内部に閉じ込める

---

## 6. テスト方針

### 6.1 Domainテスト

- `ErrorCode`, `Severity`, `AdrRef`, `FixExample`, `HarnessErrorFactory`, `SeverityContractEnforcer`, `ErrorDefinitionRegistry` をユニットテストで検証する
- `L{n}-{nnn}` 形式違反、ADR未存在、fix_example必須違反、severity格下げを主要異常系として網羅する
- テストケース名は日本語、AAA構成、実行結果は `actual` 変数に代入する

### 6.2 Applicationテスト

- UseCase 単位で外部 Port のみをモックする
- Domain の値オブジェクトやサービスは実体を使い、ドメインモックは禁止する
- `NormalizeValidatorErrorsUseCase` では L1-L4 の legacy 出力差異を fixture 化して回帰テストする

### 6.3 Infrastructureテスト

- `docs/ADR/` fixture を使った ADR 実在確認テスト
- fix_example 適用前後の validator 実行テスト
- 現行 [`scripts/harness/core/error-reporter.ts`](/Users/jumpei/dev/ALIDL_HARNESS/phasegate/scripts/harness/core/error-reporter.ts) から canonical DTO への変換テスト

### 6.4 契約テスト

- Shared Kernel の公開型が [`docs/product/units/integration_contract.md`](/Users/jumpei/dev/ALIDL_HARNESS/phasegate/docs/product/units/integration_contract.md) の `HarnessError` 契約と一致することを検証する
- `severity` readonly 契約の型テストと、実行時の freeze テストを両方置く
- fix_example 更新時に必ず `ValidateAllFixExamplesUseCase` が走る CI テストを追加する

---

## 7. 見積もり

| 作業 | 見積もり | 備考 |
|------|---------|------|
| Domain層設計・実装 | 2.0人日 | VO/registry/enforcer/factory |
| Application層設計・実装 | 1.5人日 | 生成・正規化・検証ユースケース |
| Infrastructure層設計・実装 | 2.0人日 | ADR確認、validator実行、legacy adapter |
| Shared Kernel公開整備 | 1.0人日 | export path固定、型互換整理 |
| テスト整備 | 2.0人日 | domain/application/infrastructure/contract |
| CI統合 | 1.0人日 | fix_example自動検証導線 |

**合計**: 9.5人日

見積もり前提:

- `docs/ADR/` の frontmatter 形式は現行契約から大きく変わらない
- validator 実行入口は `scripts/harness/validators/*.ts` の既存資産を流用できる
- Wave 1 では UI/CLI の専用 presentation 実装を持たず、契約公開に集中する
