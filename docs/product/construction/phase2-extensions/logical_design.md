# 論理設計: phase2-extensions

> **Unit ID**: phase2-extensions
> **作成日**: 2026-03-20
> **対応ストーリー**: HF2-01, HF2-02, HF2-03, HF2-04
> **モード**: Unit横断設計（Phase 2 拡張バリデータ）
> **前提ドキュメント**:
> - `docs/product/construction/phase2-extensions/domain_model.md`
> - `docs/principles/architecture-philosophy.md`
> - `docs/inception/_shared/cross_cutting_decisions.md`

---

## 1. アーキテクチャ概要

### 1.1 層構成と責務

| 層 | 責務 | 主な構成要素 | 依存先 |
|----|------|-------------|--------|
| Domain | DocFreshnessRule・PointerRule集約の不変条件、FreshnessThreshold・DocumentAge・Pointer・PointerValidationResult・E2EStrategyTemplateのVO値検証、FreshnessCheckService・PointerResolutionServiceドメインサービス、ポート定義（5本） | 集約ルート、値オブジェクト、ドメインサービス、ポートインターフェース | なし |
| Application | ドメインモデルを用いたユースケース調停（HF2-01〜HF2-03）、入出力DTOへの投影 | UseCase、DTO | Domain |
| Infrastructure | ドメインポート実装、Git logによるDocumentAge算出、Globファイルスキャン、正規表現Pointer抽出、node:fsによる実在確認、HarnessConfigV2からの設定読み込み | Adapter | Application, Domain |
| Presentation | CLIハンドラー、出力フォーマッター、終了コード決定 | CLI handler, Formatter | Application, Domain |

### 1.2 依存方向

```text
domain <- application <- infrastructure
domain <- application <- presentation
```

- Domain層は外部I/Oに依存しない。集約・VO・ドメインサービスはポートインターフェースのみを参照する
- Application層はDomain調停に徹し、I/O実装を保持しない
- Infrastructure層がPortインターフェースを実装（依存逆転の原則）
- Presentation層はUseCaseの出力DTOを受け取り、CLIフォーマットに変換する

---

## 2. ディレクトリ構成

```
scripts/harness/phase2-extensions/
├── domain/
│   ├── aggregates/
│   │   ├── doc-freshness-rule.ts          # DocFreshnessRule集約ルート
│   │   └── pointer-rule.ts               # PointerRule集約ルート
│   ├── value-objects/
│   │   ├── freshness-threshold.ts        # 鮮度閾値VO
│   │   ├── document-age.ts               # 経過日数VO
│   │   ├── pointer.ts                    # ポインタ参照VO
│   │   ├── pointer-validation-result.ts  # ポインタ検証結果VO
│   │   └── e2e-strategy-template.ts      # E2Eテンプレート内容VO
│   ├── services/
│   │   ├── freshness-check-service.ts    # 鮮度判定ドメインサービス
│   │   └── pointer-resolution-service.ts # ポインタ実在検証ドメインサービス
│   ├── ports/
│   │   ├── document-age-port.ts          # Git log/mtime取得ポート
│   │   ├── document-scanner-port.ts      # Globファイルスキャンポート
│   │   ├── pointer-extractor-port.ts     # 正規表現Pointer抽出ポート
│   │   ├── pointer-resolver-port.ts      # ファイル実在確認ポート
│   │   └── freshness-config-port.ts      # 鮮度設定読み込みポート
│   ├── errors/
│   │   └── phase2-extensions-domain-error.ts
│   └── index.ts                          # ドメイン層公開API
├── application/
│   ├── usecases/
│   │   ├── check-doc-freshness-usecase.ts      # HF2-01: 鮮度チェック
│   │   ├── validate-doc-pointers-usecase.ts    # HF2-02: ポインタ検証
│   │   └── generate-e2e-template-usecase.ts    # HF2-03: E2Eテンプレート生成
│   ├── dto/
│   │   ├── check-doc-freshness-input.ts
│   │   ├── check-doc-freshness-output.ts
│   │   ├── validate-doc-pointers-input.ts
│   │   ├── validate-doc-pointers-output.ts
│   │   ├── generate-e2e-template-input.ts
│   │   └── generate-e2e-template-output.ts
│   └── index.ts
├── infrastructure/
│   ├── adapters/
│   │   ├── git-log-document-age-adapter.ts          # git log --format=%ai
│   │   ├── file-system-document-scanner-adapter.ts  # fast-glob使用
│   │   ├── regex-pointer-extractor-adapter.ts       # 正規表現抽出
│   │   ├── file-system-pointer-resolver-adapter.ts  # node:fs実在確認
│   │   └── harness-config-freshness-adapter.ts      # HarnessConfigV2から設定読み込み
│   └── index.ts
├── presentation/
│   ├── handlers/
│   │   ├── check-freshness-handler.ts      # harness:check-freshness CLIハンドラー
│   │   ├── validate-pointers-handler.ts    # harness:validate-pointers CLIハンドラー
│   │   └── generate-e2e-template-handler.ts # harness:generate-e2e-template CLIハンドラー
│   ├── formatters/
│   │   ├── freshness-result-formatter.ts
│   │   └── pointer-result-formatter.ts
│   └── index.ts
└── composition-root.ts                    # Unit Composition Root
```

---

## 3. ストーリー別設計

### 3.1 HF2-01: 設計文書鮮度チェック（doc-freshness-checker L4バリデータ）

#### ユースケース: CheckDocFreshnessUseCase

```typescript
// Input DTO
interface CheckDocFreshnessInput {
  dryRun?: boolean;         // デフォルト: false
  targetPattern?: string;   // 省略時は全ルール対象
  format?: 'text' | 'json'; // 出力形式
}

// Output DTO
interface CheckDocFreshnessOutput {
  results: FreshnessCheckResultDto[];
  summary: {
    total: number;
    ok: number;
    warn: number;
    error: number;
  };
  errors: HarnessError[];
}

interface FreshnessCheckResultDto {
  ruleId: string;
  documentPath: string;
  ageInDays: number;
  ageSource: 'git-log' | 'file-mtime';
  level: 'ok' | 'warn' | 'error';
  message: string;
}
```

#### フロー詳細

1. `FreshnessConfigPort.loadRules()` → `DocFreshnessRule[]`取得
2. `targetPattern`指定があれば対象ルールをフィルタリング
3. 各ルールに対して `DocumentScannerPort.scan(rule.documentPattern)` → ファイルパス[]
4. 各ドキュメントに対して `DocumentAgePort.getAge(path)` → `DocumentAge`
5. `FreshnessCheckService.check(rule, documentAge)` → `FreshnessCheckResult`
6. 全結果を集約してOutputDTOを構築
7. `dryRun=true`の場合は実際のL4バリデーション結果をドライラン出力するのみ

#### Infrastructure Adapter: GitLogDocumentAgeAdapter

```typescript
// DocumentAgePortの実装
// child_process.execSync を使用

getAge(documentPath: string): Promise<DocumentAge> {
  try {
    const output = execSync(
      `git log --format=%ai -1 -- "${documentPath}"`,
      { cwd: projectRoot, encoding: 'utf8', timeout: 5000 }
    ).trim();

    if (output.length > 0) {
      const lastCommitDate = new Date(output);
      const ageInDays = diffInDays(new Date(), lastCommitDate);
      return DocumentAge.create({ ageInDays, source: 'git-log' });
    }
    // フォールバック: mtime
    return this.getAgeFromMtime(documentPath);
  } catch {
    // Gitコマンド失敗: mtimeフォールバック
    return this.getAgeFromMtime(documentPath);
  }
}

private async getAgeFromMtime(documentPath: string): Promise<DocumentAge> {
  const stat = await fs.stat(documentPath);
  const ageInDays = diffInDays(new Date(), stat.mtime);
  return DocumentAge.create({ ageInDays, source: 'file-mtime' });
}
```

#### Infrastructure Adapter: FileSystemDocumentScannerAdapter

- `fast-glob` を使用してGlobパターンマッチング
- プロジェクトルート基準でスキャン
- `node_modules/` / `.git/` は自動除外

#### Infrastructure Adapter: HarnessConfigFreshnessAdapter

- `HarnessConfigV2` から `freshnessRules` セクションを取得
- `DocFreshnessRule.create()` を呼び出してドメインモデルへ変換
- デフォルト設定（存在しない場合）: warnThresholdDays=30, errorThresholdDays=90

---

### 3.2 HF2-02: ドキュメントポインタ実在検証（pointer-validator L4バリデータ）

#### ユースケース: ValidateDocPointersUseCase

```typescript
// Input DTO
interface ValidateDocPointersInput {
  targetPattern?: string;      // 省略時は全ルール対象
  includeUrlPointers?: boolean; // URLポインタを出力に含めるか（検証はスキップ）
  format?: 'text' | 'json';
}

// Output DTO
interface ValidateDocPointersOutput {
  results: PointerValidationResultDto[];
  summary: {
    totalDocuments: number;
    totalPointers: number;
    brokenPointers: number;
    skippedUrlPointers: number;
  };
  passed: boolean;
  errors: HarnessError[];
}

interface PointerValidationResultDto {
  documentPath: string;
  pointerTarget: string;
  pointerType: 'file-path' | 'url';
  isResolvable: boolean;
  errorMessage: string | null;
}
```

#### フロー詳細

1. `PointerConfigPort.loadRules()` → `PointerRule[]`取得
2. 各ルールに対して `DocumentScannerPort.scan(rule.documentPattern)` → ファイルパス[]
   - `pointerRules` / `freshnessRules` 未指定時は `paths.designDocs/**/*.md` をデフォルト対象にする。
   - デフォルト配線では `paths.inceptionDocs` と `docs/**/archive/` を除外する。これらは計画・履歴文書であり、継続保守対象の設計文書として扱わない。
3. 各ドキュメントに対して `PointerExtractorPort.extract(path)` → `Pointer[]`
4. `PointerResolutionService.resolve(pointers)` → `PointerValidationResult[]`
   - `file-path`: `PointerResolverPort.resolve()` で実在確認
   - `url`: スキップ（isResolvable=true）
5. broken Pointer（isResolvable=false）を集約
6. `rule.failOnBroken=true` の場合、brokenPointers>0 でエラーとして扱う

#### Infrastructure Adapter: RegexPointerExtractorAdapter

Phase 2初期の抽出対象パターン:

```typescript
// Markdownリンク: [テキスト](パス)
const MARKDOWN_LINK_REGEX = /\[([^\]]+)\]\(([^)]+)\)/g;

// 相対パス参照: docs/ scripts/ から始まるパス
const RELATIVE_PATH_REGEX = /(?:^|\s)((?:docs|scripts)\/[^\s,'")\]]+)/gm;

// PointerType判定
const isUrlTarget = (target: string): boolean =>
  target.startsWith('http://') || target.startsWith('https://');
```

抽出時は Markdown 相対リンクをドキュメント位置基準のプロジェクト相対パスへ正規化し、`#anchor` / 行番号サフィックス / テンプレート表記 / glob 表記 / 日本語説明文は file-path 検証対象から除外する。

#### Infrastructure Adapter: FileSystemPointerResolverAdapter

```typescript
// PointerResolverPortの実装
// node:fs を使用（外部ネットワークアクセスなし）

resolve(pointer: Pointer): Promise<boolean> {
  if (pointer.type === 'url') {
    // URLはPhase 2スコープ外: 常にtrueを返す
    return Promise.resolve(true);
  }
  // file-path: プロジェクトルートからの相対パスとして実在確認
  const absolutePath = path.resolve(projectRoot, pointer.target);
  return fs.access(absolutePath)
    .then(() => true)
    .catch(() => false);
}
```

---

### 3.3 HF2-03: E2Eテスト戦略テンプレート生成

#### ユースケース: GenerateE2ETemplateUseCase

```typescript
// Input DTO
interface GenerateE2ETemplateInput {
  targetPhase: string;          // 対象フェーズ名（例: 'wave1', 'phase2'）
  outputPath?: string;          // 省略時は stdout 出力
  format?: 'text' | 'json';
}

// Output DTO
interface GenerateE2ETemplateOutput {
  templateContent: string;      // Markdownテンプレート内容
  targetPhase: string;
  generatedAt: string;          // ISO 8601
  outputPath: string | null;    // 実際に書き出したパス（stdout時はnull）
  errors: HarnessError[];
}
```

#### テンプレート生成ロジック

`E2EStrategyTemplate.create(targetPhase)` が以下の構造でMarkdownを生成:

```markdown
# E2Eテスト戦略: {targetPhase}

## 概要

{targetPhase} フェーズのE2Eテスト戦略テンプレートです。
生成日時: {generatedAt}

## テスト対象シナリオ

- [ ] ユーザー操作の正常フロー
- [ ] エラーハンドリングフロー
- [ ] 境界値・エッジケース

## テスト実行方針

| 項目 | 内容 |
|------|------|
| フレームワーク | Vitest (ユニット/統合), Playwright (E2E) |
| 実行タイミング | PR時・スケジュール実行 |
| 合格基準 | 全テストPASS、カバレッジ90%以上 |

## シードデータ要件

（チームで定義すること）

## テスト環境設定

（チームで定義すること）
```

---

@story-id HF2-04
### 3.4 HF2-04: initial_creation expiration 検出（initial-creation-expiration-checker L4バリデータ）

**背景**: `traceability.initial_creation: true` は新規作成文書の @story-id 注釈を不要とするフラグであるが、2 回目以降の改訂時に削除されないと validator が永続的に素通りする。ISSUE-011 P3-4 で検出された drift パターンに対する L4 検証機構を新設する。

**責務の分離**: HF2-01 (doc-freshness-checker) は「最終更新日」を基準に古い文書を検出する。本 validator は「初回コミット日」と「コミット回数」を基準に、新規作成フラグ付きのまま陳腐化した文書を検出する。両者は独立した集約と UseCase を持つ。

**主要コンポーネント**:
- 集約: `InitialCreationExpirationRule`
- VO: `InitialCreationAge`（ageInDays + commitCount + source）
- ドメインサービス: `InitialCreationExpirationCheckService`
- 新規ポート: `InitialCreationExpirationConfigPort`, `FrontmatterReaderPort`, `InitialCreationAgePort`
- UseCase: `CheckInitialCreationExpirationUseCase`
- CLI ハンドラー: `CheckInitialCreationExpirationHandler`（`phasegate p2:check-initial-creation` として露出想定）

詳細なドメイン・フロー・テスト観点は `docs/inception/phase2-extensions/HF2-04/logical_design.md` を参照。

**HarnessError コード**: `L4-231` (閾値超過 WARN), `L4-232` (frontmatter parse 失敗 WARN), 既存 `L4-299` (config load 失敗 error) を再利用。

---

## 4. Ports 詳細仕様

### 4.1 DocumentAgePort

```typescript
interface DocumentAgePort {
  /**
   * 指定ファイルの最終更新からの経過日数を取得する。
   * Git log が利用可能な場合は git-log を使用し、
   * 失敗時は file-mtime にフォールバックする。
   *
   * @param documentPath プロジェクトルートからの相対パス
   */
  getAge(documentPath: string): Promise<DocumentAge>;
}
```

### 4.2 DocumentScannerPort

```typescript
interface DocumentScannerPort {
  /**
   * Globパターンに一致するファイルパス一覧を返す。
   * プロジェクトルート基準。node_modules・.git は自動除外。
   *
   * @param pattern fast-glob互換のGlobパターン
   */
  scan(pattern: string): Promise<string[]>;
}
```

### 4.3 PointerExtractorPort

```typescript
interface PointerExtractorPort {
  /**
   * ドキュメントファイルから正規表現でPointer[]を抽出する。
   * Markdownリンク記法と相対パス参照を対象とする。
   *
   * @param documentPath プロジェクトルートからの相対パス
   */
  extract(documentPath: string): Promise<Pointer[]>;
}
```

### 4.4 PointerResolverPort

```typescript
interface PointerResolverPort {
  /**
   * Pointerの参照先が実在するかを確認する。
   * type='url' は常にtrueを返す（Phase 2スコープ外）。
   * type='file-path' は node:fs でパス実在確認。
   *
   * @param pointer 検証対象のPointer
   */
  resolve(pointer: Pointer): Promise<boolean>;
}
```

### 4.5 FreshnessConfigPort

```typescript
interface FreshnessConfigPort {
  /**
   * HarnessConfigV2から DocFreshnessRule[] を読み込む。
   * 設定が存在しない場合はデフォルトルールを返す。
   */
  loadRules(): Promise<DocFreshnessRule[]>;

  /**
   * HarnessConfigV2から PointerRule[] を読み込む。
   * 設定が存在しない場合はデフォルトルールを返す。
   */
  loadPointerRules(): Promise<PointerRule[]>;
}
```

---

## 5. Presentation Handlers 詳細

### 5.1 CheckFreshnessHandler

- コマンド: `harness:check-freshness`
- オプション: `--pattern <glob>`, `--format <text|json>`, `--dry-run`
- 終了コード: 0（全okまたはwarnのみ）/ 1（errorあり）/ 2（引数不正）
- 出力: FreshnessResultFormatterがテーブル形式または JSON を出力

### 5.2 ValidatePointersHandler

- コマンド: `harness:validate-pointers`
- オプション: `--pattern <glob>`, `--format <text|json>`, `--include-urls`
- 終了コード: 0（broken Pointerなし）/ 1（broken Pointerあり）/ 2（引数不正）
- 出力: PointerResultFormatterがbroken Pointer一覧を出力

### 5.3 GenerateE2ETemplateHandler

- コマンド: `harness:generate-e2e-template`
- オプション: `--phase <string>` （必須）, `--output <path>`, `--format <text|json>`
- 終了コード: 0（生成成功）/ 1（生成失敗）/ 2（引数不正）
- 出力: Markdownテンプレートを stdout または指定ファイルへ出力

---

## 6. モジュール間依存関係まとめ

```
phase2-extensions/domain
  ← phase2-extensions/application
    ← phase2-extensions/infrastructure
    ← phase2-extensions/presentation

外部Unit依存:
  harness-error      → HarnessError, HarnessErrorCode（Shared Kernel）
  config-foundation  → HarnessConfigV2（Shared Kernel）
  （validator-system / harness-api は直接依存なし）
```

---

## 7. 設計判断記録

### D1: PointerConfigPortをFreshnessConfigPortに統合

PointerRule設定もHarnessConfigV2から読み込む点でFreshnessConfigPortと同じパターンであるため、`FreshnessConfigPort.loadPointerRules()` として同一ポートに統合した。これによりHarnessConfigV2アダプタが1つに集約され、実装コストを削減できる。

### D2: fast-globをDocumentScannerに採用

`fast-glob` はすでに外部依存として採用済みであり、Glob展開の標準ライブラリとして使用する（新規依存追加なし）。

### D3: GenerateE2ETemplateはファイルI/Oをハンドラーに委譲

E2EStrategyTemplate（VO）はMarkdown文字列を保持するのみとし、ファイル書き出しはPresentationの`GenerateE2ETemplateHandler`が担う。これにより、テンプレート生成ロジックとI/Oを分離し、UseCaseのテスタビリティを確保する。

@story-id HF2-04
### D4: initial-creation-expiration-checker を HF2-01 から分離して新設

HF2-01 (doc-freshness-checker) に frontmatter セマンティクスチェックを統合する案も検討したが、以下の理由で独立 validator として新設する:

1. **起点が異なる**: HF2-01 は「最終更新日」、HF2-04 は「初回コミット日 + コミット回数」
2. **対象判定が異なる**: HF2-01 は全 md 無差別、HF2-04 は `initial_creation: true` のみ
3. **severity 方針が異なる**: HF2-01 は warn/error 二段階、HF2-04 は warn 固定（誤検知リスクを考慮した段階導入）

ドメインサービス `InitialCreationExpirationCheckService` と集約 `InitialCreationExpirationRule` を新設し、HF2-01 の `FreshnessCheckService` とは独立させる。共通部分は `DocumentScannerPort` のみ再利用する。

### D5: 既存 frontmatter-flag-parser の再利用

`scripts/harness/traceability-model/infrastructure/parsers/frontmatter-flag-parser.ts` は軽量かつ安定した YAML frontmatter パーサーである。HF2-04 の `MarkdownFrontmatterReaderAdapter` からこれを直接 import して再利用する。`FrontmatterReaderPort` で 1 段階 wrap することで、将来 parser が traceability-model 内で拡張された場合の影響範囲を adapter 層に閉じ込める。

### WI-128: compatibility command position

`p2:check-freshness` and `p2:validate-pointers` remain compatibility entry points for existing automation. The canonical L4 validator IDs are L4-004 `doc-freshness` and L4-005 `pointer-validation`, and the canonical L4 execution path is `validate --layer L4`. @work-item-id WI-128
<!-- @work-item-id WI-122 -->
## WI-122 Operational Semantics

`ValidateDocPointersUseCase` classifies raw pointers into semantic pointer types before applying fail/warn/skip policy. Broken pointer output includes owner, semantic type, source document, severity, and next action. External URLs skip by default unless explicitly included by policy.

`CheckDocFreshnessUseCase` remains threshold based but consumes `DocumentAgeSource` so stable old docs can be distinguished from docs stale after related source/WI/product changes.
