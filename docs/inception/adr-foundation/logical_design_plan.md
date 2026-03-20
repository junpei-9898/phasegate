# 論理設計計画: adr-foundation

> **Unit ID**: adr-foundation
> **作成日**: 2026-03-13
> **Wave**: 1（基盤構築）
> **モード**: Unit横断論理設計（Phase 1）
> **対応ストーリー**: H05-01, H05-02, H05-03

---

## 1. スコープ

### 対象ストーリー

| Story ID | タイトル | 本計画で扱う論点 |
|----------|---------|------------------|
| H05-01 | ADRテンプレート整備 + archgateパターン定義 | ADRテンプレート構造、YAMLフロントマター、archgate表現、機械可読な保存形式 |
| H05-02 | 初期ADR作成（§12 Key Decisions全件カバー） | 11件ADRの生成・保存・一覧取得・adr_ref解決の責務分担 |
| H05-03 | ADRステータス管理 + フロントマターバリデーション | 状態遷移、Superseded制約、フロントマター自動検証、archgate error code検証 |

### 対象層

| 層 | 対象 | 理由 |
|----|------|------|
| domain | 対象 | ADR集約と不変条件を保持する中核責務 |
| application | 対象 | ADR参照、一覧取得、archgate検索、検証実行、初期投入の調整責務 |
| infrastructure | 対象 | `docs/ADR/*.md` のI/O、YAML frontmatterとMarkdown本文の双方向変換 |
| presentation | 対象外 | 統合契約上、adr-foundation所有のCLI/API公開面は未定義。Phase 1では専用アダプターを持たず、Application公開までに留める |

---

## 2. 設計方針

### 2.1 アーキテクチャ層定義

- v1正規語彙である `domain / application / infrastructure / presentation` を採用する
- 依存方向は `domain ← application ← infrastructure` を厳守する。将来Presentationを追加する場合も `domain ← application ← presentation` とする
- `port` / `usecase` / `controller` は実装パターン語彙としてのみ使用し、`@layer` には使わない
- ドメインロジックはADR集約と値オブジェクトに寄せ、Applicationは取得・永続化・整合性確認の調整役に限定する

### 2.2 技術スタック

| 項目 | 方針 |
|------|------|
| 言語 | TypeScript |
| パッケージ管理 | pnpm |
| テスト | Vitest |
| 静的検査/整形 | Biome |
| ADR保存先 | `docs/ADR/` |
| frontmatter解析 | `gray-matter` 等のYAML frontmatterライブラリをPort配下に隔離 |
| Shared Kernel参照 | `harness-error` から `HarnessError` / `ErrorCode` を import し、Applicationのエラー出力契約と archgate error code整合に利用 |

### 2.3 ディレクトリ構造方針

```text
scripts/harness/adr-foundation/
├── domain/
│   ├── aggregates/
│   ├── value-objects/
│   ├── services/
│   └── ports/
├── application/
│   ├── use-cases/
│   ├── dto/
│   └── mappers/
├── infrastructure/
│   ├── repositories/
│   ├── parsers/
│   └── serializers/
└── presentation/          # Phase 1では原則未作成
```

- テスト配置先は `scripts/harness/__tests__/adr-foundation/` とし、他Unitと同じ規約に従う
- ADR本文やテンプレート本体は `docs/ADR/` に置き、`scripts/harness/` はロジックと変換器のみを持つ
- `docs/ADR/template.md` は永続化対象ではなく参照テンプレートとして扱い、一覧取得時は除外する
- archgate逆引きregistryが必要になっても、Phase 1では生成物として扱い、真実の所在は各ADR frontmatterに置く

---

## 3. 層別設計の計画

### 3.1 Domain層

- **ADR集約**を唯一の集約ルートとし、`approve()`, `deprecate()`, `supersede(newAdrId)`, `repropose()`, `updateBody()` を保持する
- 集約の不変条件は Domain で閉じる
  - `AdrStatus` は `Proposed | Accepted | Deprecated | Superseded`
  - `Superseded` の場合は `superseded_by` 必須
  - `archgate.error_code` は横断契約の `L{n}-{nnn}` 形式
  - `adr_ref` は外部公開時に `ADR-{nnn}` 形式へ正規化
- `AdrValidationService` は frontmatter 構造検証のドメインサービスとして維持し、集約/値オブジェクトだけで表現しづらい複合検証を担う
- 型シグネチャ方針は以下とする

```ts
type AdrStatusValue = "Proposed" | "Accepted" | "Deprecated" | "Superseded";

type ArchgateEntryProps = {
  validatorId: string;
  errorCode: ErrorCode;
};

type AdrFrontmatterProps = {
  adrId: AdrId;
  title: string;
  status: AdrStatus;
  date: string; // YYYY-MM-DD
  archgate?: ArchgateMapping;
  supersededBy?: SupersededByRef;
};

type AdrBodyProps = {
  context: string;
  decision: string;
  consequences: string;
  alternatives?: string;
};
```

- `AdrId` は内部表現を `NNN` とし、`toAdrRef()` で `ADR-NNN` を返す。frontmatterの `adr_id` とファイル名と参照表記の責務を分離する
- `ArchgateMapping` は `AdrFrontmatter` の一部として保持し、`ErrorCode` をそのまま文字列で流さず型で拘束する

### 3.2 Application層

ADR集約を直接外部に露出せず、以下のユースケース群で調停する。

| ユースケース | 主対象ストーリー | 責務 |
|-------------|------------------|------|
| `GetAdrByRefUseCase` | H05-02 | `ADR-{nnn}` または `NNN` からADRを取得し、参照解決用DTOを返す |
| `ListAdrsUseCase` | H05-02 | 全ADR一覧とステータス要約を返す |
| `CreateAdrTemplateUseCase` | H05-01 | テンプレート構造とfrontmatter初期値を生成する |
| `SeedInitialAdrsUseCase` | H05-02 | 初期11件ADRの投入を調整する |
| `ChangeAdrStatusUseCase` | H05-03 | approve / deprecate / supersede / repropose を集約へ委譲する |
| `ValidateAdrFrontmatterUseCase` | H05-03 | 単一ADRのfrontmatter妥当性を検証し、結果DTOを返す |
| `ValidateAllAdrsUseCase` | H05-03 | `docs/ADR/` 全件を検証し、 `HarnessError[]` 互換の失敗結果を返す |
| `SearchArchgateMappingsUseCase` | H05-01, H05-03 | `validator_id` または `ErrorCode` から対応ADRを検索する |

- Application層で `HarnessError` を組み立て、他Unitに返す検証結果の形式を統一する
- `superseded_by` の参照先実在性のようにリポジトリ確認が必要な検証はApplicationで先に解決し、その後に集約メソッドを呼ぶ
- 初期11件ADRの本文生成はシードデータまたは定義ファイルを入力として扱い、生成ロジック自体はUseCaseに寄せず、投入順序と整合性確認のみを担当させる

### 3.3 Infrastructure層

- `FileSystemAdrRepository` が `docs/ADR/` を走査し、`template.md` を除外してADRを永続化・取得する
- `AdrFrontmatterParserPort` 実装では YAML frontmatter を parse / serialize し、`archgate.enforced_by[]` を `ErrorCode` 付きのVOへ変換する
- Markdown本文は frontmatter と分離して扱い、少なくとも `Context / Decision / Consequences / Alternatives` セクションの双方向変換を支える
- `AdrMarkdownDocumentParser` は以下の責務を持つ
  - raw Markdown → frontmatter + body section 抽出
  - body section → `AdrBody`
  - `ADR` → Markdown文字列再構成
- ファイル命名規則 `docs/ADR/{NNN}-{kebab-case-title}.md` は Infrastructure で責務を持ち、Domainにはパス生成ロジックを漏らさない
- archgate逆引きregistryは Phase 1 では生成必須にせず、必要なら `SearchArchgateMappingsUseCase` の副次生成物として後続フェーズで追加する

---

## 4. ポートインターフェース一覧

| ポート名 | 層 | 方向 | 主な操作 |
|---------|----|------|---------|
| `AdrRepositoryPort` | domain/application境界 | secondary | `findById`, `findByRef`, `findAll`, `save`, `exists`, `nextId` |
| `AdrFrontmatterParserPort` | domain/application境界 | secondary | `parseFrontmatter`, `serializeFrontmatter` |
| `AdrDocumentParserPort` | application/infrastructure境界 | secondary | `parseDocument`, `serializeDocument` |

- `AdrRepositoryPort` は永続化の唯一の入り口とし、ApplicationがファイルI/O詳細を知らない形にする
- `AdrFrontmatterParserPort` は YAML ライブラリ依存の隔離が目的であり、frontmatter構造変更時の影響面を局所化する
- `AdrDocumentParserPort` は Markdown本文の構造変換をRepositoryから分離し、frontmatter検証と本文解析を独立にテスト可能にする

---

## 5. テスト方針

| テスト層 | 主対象 | 方針 |
|---------|--------|------|
| Domain Unit Test | `ADR`, `AdrStatus`, `AdrFrontmatter`, `ArchgateMapping`, `AdrValidationService` | 状態遷移、不変条件、`ErrorCode` 形式検証をAAAで確認する |
| Application Test | 各UseCase | In-memory Repository/Parserを用い、ADR参照、archgate検索、Superseded参照整合を確認する |
| Infrastructure Integration Test | FileSystem repository, Markdown parser | fixtureの `.md` を使って frontmatter/body の往復変換と `template.md` 除外を確認する |
| Contract Test | `HarnessError` / `ErrorCode` 連携 | `ValidateAllAdrsUseCase` の失敗結果が shared kernel 契約に適合することを確認する |

- テストケース名は日本語、構造はAAA、実行結果の変数名は `actual` に統一する
- ドメインオブジェクトに対するモックは避け、外部依存にのみテストダブルを使う
- H05-03の受け入れ基準に直結するケースを最優先に用意する
  - `status` 欠落
  - 無効な `status`
  - `Superseded` だが `superseded_by` 欠落
  - `archgate.error_code` が `L{n}-{nnn}` 形式違反
  - `adr_ref` 解決対象が存在しない

---

## 6. 見積もり

| 作業項目 | 目安 |
|---------|------|
| Domain設計・型定義 | 1.5人日 |
| Applicationユースケース設計 | 1.5人日 |
| Infrastructure設計（parser/repository） | 2.0人日 |
| テスト設計 | 1.0人日 |
| レビュー・設計調整 | 0.5人日 |
| 合計 | 6.5人日 |

- 主要リスクは「初期11件ADRの本文ソース確定」と「archgate逆引き要否の追加要求」
- Phase 1の完了条件は、ADR参照・archgate検索・frontmatter検証の責務分解が確定し、後続の `logical_design.md` に落とせる粒度まで論点が閉じていることとする
