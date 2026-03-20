# 論理設計計画: traceability-model

> **Unit ID**: traceability-model
> **作成日**: 2026-03-13
> **モード**: Phase 1（Unit全体の論理設計計画）
> **対応ストーリー**: H03-01, H03-02, H03-03

---

## 1. スコープ

### 対象ストーリー

| Story ID | タイトル | 本計画で扱う主責務 |
|----------|---------|-------------------|
| H03-01 | @unit/@layerメタデータ体系 + L2 metadataバリデータ基本実装 | 実装ファイルの `@unit` / `@layer` 整合性検証 |
| H03-02 | @story-idメタデータ + 設計文書累積更新時の付与検証 | 設計文書の `@story-id HXX-XX` 付与・書式・存在検証 |
| H03-03 | @storyメタデータ + 逆引きチェーン全体検証 | テストファイルの `@story` 検証と実装→設計→計画のチェーン構築 |

### 対象層

| 層 | 対象 | 理由 |
|----|------|------|
| `domain` | 対象 | StoryId, TraceabilityChain, MetadataValidator などの中核モデルを保持するため |
| `application` | 対象 | metadata検証・別名解決・チェーン構築のユースケースを提供するため |
| `infrastructure` | 対象 | Markdown/TypeScriptファイル解析、unit定義取得、story catalog取得が必要なため |
| `presentation` | 対象外 | CLI/CI/Webhookの入口は harness-api / validator-system 側が所有し、本Unitは headless service として提供するため |

### スコープ境界

- 本Unitは `L2 metadata` の正規ロジックと `StoryId` Shared Kernel を所有する
- `L1` の存在チェックは biome-ast-engine が担当し、本Unitでは重複実装しない
- `L3 nyquist` の要件被覆判定は nyquist-validation が担当し、本Unitは `@story` と StoryId を提供する
- `L4 drift-detect` の網羅的乖離検出は validator-system 側が担当し、本Unitは逆引きチェーン構築能力を提供する

---

## 2. 設計方針

### 2.1 アーキテクチャ層定義

- 正規レイヤー語彙は `domain / application / infrastructure / presentation` を採用する
- `port / usecase / controller` は実装パターン名としてのみ使用し、`@layer` の値には使用しない
- `architecture-philosophy.md` に v0 語彙が残っていても、本計画では `cross_cutting_decisions.md §2` を優先契約として扱う
- traceability-model は状態を持つ集約を置かず、値オブジェクト + ドメインサービス + アプリケーションサービスで構成する

### 2.2 技術スタック

| 技術 | 用途 |
|------|------|
| TypeScript（ESM） | Domain/Application/Infrastructure 実装 |
| Node.js 標準ライブラリ (`fs`, `path`) | ファイル探索、本文読み取り、相対パス解決 |
| 行指向パーサー | `@unit` / `@layer` / `@story-id` / `@story` の抽出 |
| frontmatter抽出ユーティリティ | H03-02 の初回作成判定フラグ読取 |
| Vitest | ユニットテスト / 統合テスト / fixtureベース検証 |
| pnpm | スクリプト実行・依存管理 |

### 2.3 ディレクトリ構造方針

既存の `scripts/harness/core/metadata-parser.ts` と `scripts/harness/validators/metadata.ts` は v0 互換の暫定実装として扱い、v1 は Unit境界を明示した構成へ寄せる。

```text
scripts/harness/
├── shared-kernel/
│   └── story-id.ts
├── traceability-model/
│   ├── domain/
│   │   ├── value-objects/
│   │   ├── services/
│   │   ├── ports/
│   │   └── constants/
│   ├── application/
│   │   ├── usecases/
│   │   └── dto/
│   ├── infrastructure/
│   │   ├── parsers/
│   │   ├── repositories/
│   │   └── gateways/
│   └── index.ts
└── validators/
    └── metadata.ts        # validator-system 側のアダプターとして段階移行
```

テストは以下で対称配置する。

```text
scripts/harness/__tests__/traceability-model/
├── domain/
├── application/
├── infrastructure/
└── integration/
```

---

## 3. 層別設計の計画

### 3.1 Domain層

#### 型シグネチャ方針

```ts
type LayerName = "domain" | "application" | "infrastructure" | "presentation";
type MetadataTagType = "@unit" | "@layer" | "@story-id" | "@story";
type ChainLinkType = "implementation-to-unit" | "unit-to-design" | "design-to-story" | "story-to-plan";

class StoryId {
  static parse(value: string): StoryId;
  static isValid(value: string): boolean;
  equals(other: StoryId): boolean;
  toString(): string;
}

class MetadataTag {
  readonly type: MetadataTagType;
  readonly value: string;
  readonly lineNumber: number;
  readonly filePath: ProjectRelativePath;
}

class StoryIdAnnotation {
  readonly storyId: StoryId;
  readonly lineNumber: number;
  readonly contextLine: string;
}

class ChainLink {
  readonly type: ChainLinkType;
  readonly from: ProjectRelativePath;
  readonly to: ProjectRelativePath;
  readonly resolved: boolean;
}

class TraceabilityChain {
  readonly origin: ProjectRelativePath;
  readonly links: readonly ChainLink[];
  isComplete(): boolean;
  getBrokenLinks(): readonly ChainLink[];
}

class MetadataValidationResult {
  readonly valid: boolean;
  readonly errors: readonly HarnessError[];
  readonly warnings: readonly HarnessError[];
}
```

#### ドメインサービス方針

- `MetadataValidator`
  - `@unit` と unit定義の一致
  - `@layer` と正規語彙の一致
  - `@story-id` / `@story` と StoryCatalog の参照解決
  - 設計文書の初回作成免除判定
  - `fix_example` を含む `L2-002` 系エラー生成
- `StoryIdAliasResolver`
  - v0 `US-XXX` を read-only で受け付け、v1 `HXX-XX` へ解決する
  - `StoryId` 本体には legacy 解決責務を持たせない
- `TraceabilityChainBuilder`
  - 起点ファイルから `@unit` を読み、対応する `docs/product/construction/{unit}/` と `docs/inception/{unit}/{HXX-XX}/` を辿る
  - チェーン欠損を `TraceabilityChain` の broken link として返し、例外ではなく値で扱う

#### ドメイン境界の補足

- `StoryId` のみ Shared Kernel として公開し、`LayerName` や `TraceabilityChain` はUnit内に閉じる
- `TraceabilityChain` は横断契約 §6 に従い、集約ではなく不変値オブジェクトとして保持する

### 3.2 Application層

#### ユースケース一覧

| ユースケース | 対応Story | 入力 | 出力 | 役割 |
|-------------|----------|------|------|------|
| `ValidateImplementationMetadataUseCase` | H03-01 | 実装ファイル群 | `MetadataValidationResult[]` | `@unit` / `@layer` の整合性検証 |
| `ValidateDesignStoryAnnotationsUseCase` | H03-02 | 設計文書群 | `MetadataValidationResult[]` | `@story-id` の存在・書式・初回免除判定 |
| `ValidateTestStoryMetadataUseCase` | H03-03 | テストファイル群 | `MetadataValidationResult[]` | `@story` の存在・参照解決 |
| `BuildTraceabilityChainUseCase` | H03-03 | 起点実装ファイル | `TraceabilityChain` | 実装→設計→計画の逆引きチェーン構築 |
| `ResolveLegacyStoryIdUseCase` | H03-01/H03-02/H03-03 | legacy ID文字列 | `StoryId \| null` | v0 `US-XXX` の別名解決 |

#### Application設計の要点

- 1ユースケース 1責務で分け、validator-system 側は必要なユースケースのみ呼び出す
- 既存 `scripts/harness/validators/metadata.ts` は最終的に `Validate*UseCase` 群への橋渡しに縮退させる
- 入出力DTOは `validator-system` / `nyquist-validation` が消費しやすい配列ベースの結果形式に揃える

### 3.3 Infrastructure層

#### 実装予定アダプター

| アダプター | 実装ポート | 役割 |
|-----------|-----------|------|
| `MarkdownStoryCatalogGateway` | `StoryCatalogPort` | `docs/product/user_stories.md` から StoryId 一覧と旧US対応表を抽出 |
| `MarkdownUnitDefinitionGateway` | `UnitDefinitionPort` | `docs/product/units/*_unit.md` から有効Unit名一覧を抽出 |
| `SourceMetadataReader` | `MetadataReaderPort` | TypeScript/TSX/JS系ファイルから `@unit` / `@layer` / `@story` を抽出 |
| `MarkdownDesignDocumentGateway` | `DesignDocumentPort` | `docs/product/construction/{unit}/` 配下の `@story-id` と frontmatter を抽出 |
| `InceptionPlanGateway` | `InceptionPlanPort` | `docs/inception/{unit}/{HXX-XX}/` または Unit計画配下の存在確認 |

#### パーサー方針

- ソースコード側は AST ではなく行指向パーサーを用いる
  - AST 構築は biome-ast-engine の責務であり、本Unitで重複させない
- Markdown 側は次の2段で扱う
  - frontmatter 抽出: 初回作成免除フラグを読む
  - 本文走査: `@story-id HXX-XX` が独立行かつ設計要素直前かを判定する
- Story catalog は `user_stories.md` の H03 以外も含め全件ロードするが、起動時キャッシュ + 変更時再読込で性能を確保する

### 3.4 Presentation層

本Unit単体では実装しない。外部公開は `index.ts` の薄い export 面に限定し、CLI/CI/Hook のプレゼンテーション責務は harness-api / validator-system / nyquist-validation 側のアダプターで扱う。

---

## 4. ポートインターフェース一覧

| ポート | 主なメソッド | 用途 |
|--------|-------------|------|
| `StoryCatalogPort` | `getAllStoryIds(): readonly StoryId[]` `getAliasMap(): ReadonlyMap<string, StoryId>` `exists(id: StoryId): boolean` | `user_stories.md` を正規ソースとして StoryId を解決する |
| `UnitDefinitionPort` | `getAllUnitNames(): readonly string[]` `exists(unitName: string): boolean` `findConstructionRoot(unitName: string): ProjectRelativePath \| null` | `@unit` の妥当性検証と設計文書位置の解決 |
| `MetadataReaderPort` | `readImplementationTags(file: ProjectRelativePath): readonly MetadataTag[]` `readTestTags(file: ProjectRelativePath): readonly MetadataTag[]` | 実装/テストファイルのメタデータ抽出 |
| `DesignDocumentPort` | `listByUnit(unitName: string): readonly ProjectRelativePath[]` `readStoryAnnotations(file: ProjectRelativePath): readonly StoryIdAnnotation[]` `readFrontmatterFlags(file: ProjectRelativePath): DesignDocumentFlags` | 設計文書の `@story-id` 読取と初回判定 |
| `InceptionPlanPort` | `exists(unitName: string, storyId: StoryId): boolean` `findPlanRoot(unitName: string, storyId: StoryId): ProjectRelativePath \| null` | 逆引きチェーン終端の計画文書存在確認 |

### ポート設計ルール

- ドメインは `string` 生値を極力受け取らず、`StoryId` や `ProjectRelativePath` に正規化してから渡す
- ファイルI/O例外は Infrastructure で吸収し、Application には `HarnessError` に変換可能な失敗として返す
- 参照系ポートに書き込み責務は持たせない

---

## 5. Shared Kernel公開戦略

### 公開対象

- 公開するのは `StoryId` のみ
- 非公開にするもの
  - `StoryIdAliasResolver`
  - `TraceabilityChain`
  - `MetadataTag`
  - `LayerName`

### 公開方法

1. 正規実装は `scripts/harness/traceability-model/domain/value-objects/story-id.ts` に置く
2. 外部公開面として `scripts/harness/shared-kernel/story-id.ts` を設け、`StoryId` と最小限の生成関数だけを再公開する
3. 他Unitは `shared-kernel` 経由でのみ import し、traceability-model 内部実装へ直接依存しない

### 公開契約

```ts
export { StoryId } from "../traceability-model/domain/value-objects/story-id.js";
export function parseStoryId(value: string): StoryId;
export function isStoryId(value: string): boolean;
```

### 運用ルール

- 互換性のある追加は許容するが、既存 `StoryId` API の破壊的変更は不可
- v0 `US-XXX` 受理は `StoryIdAliasResolver` 側に閉じ込め、Shared Kernel API には露出しない
- StoryId の参照元は `docs/product/user_stories.md` を唯一の業務ソースとする

---

## 6. テスト方針

### テスト観点

| レイヤー | 主対象 | 重点観点 |
|---------|-------|---------|
| Domain | `StoryId`, `TraceabilityChain`, `MetadataValidator`, `StoryIdAliasResolver` | 不変条件、形式検証、broken link 判定 |
| Application | 各 `Validate*UseCase`, `BuildTraceabilityChainUseCase` | ポート協調、DTO整形、L2/L4責務分離 |
| Infrastructure | Markdown/Source parser, catalog gateway, unit definition gateway | fixture入力に対する抽出精度 |
| Integration | validator adapter + shared-kernel export | 実装→設計→計画チェーンの疎通 |

### テスト規約の適用

- AAA パターンで記述する
- Act は 1 回に限定し、実行結果は `actual` に代入する
- テストケース名は日本語で記述する
- Domain の実体はモックせず、モックは `Port` など管理下にない外部依存に限定する

### 主要テストケース

- `StoryId.parse` が `HXX-XX` 以外を拒否する
- `StoryIdAliasResolver` が `US-XXX` を `HXX-XX` に正規化できる
- `MetadataValidator` が `@layer usecase` を不正値として `L2-002` で返す
- `MetadataValidator` が設計文書の初回作成フラグありの場合のみ `@story-id` 欠落を許容する
- `BuildTraceabilityChainUseCase` が `implementation -> construction -> inception` の欠損箇所を `brokenLinks` として返す
- Shared Kernel export が `StoryId` 以外を漏らしていない

---

## 7. 見積もり

| 作業 | 見積もり |
|------|---------|
| Domain層の型・サービス設計 | 1.5人日 |
| Application層のユースケース設計 | 1.0人日 |
| Infrastructure層のパーサー/ゲートウェイ設計 | 1.5人日 |
| Shared Kernel公開面と既存 validator からの移行設計 | 0.5人日 |
| テスト設計・fixture整備 | 1.5人日 |
| 合計 | 6.0人日 |

### 見積もり上のリスク

- `user_stories.md` と unit定義Markdownのフォーマット揺れが大きい場合、Infrastructure実装が 0.5〜1.0人日増える
- H03-02 の初回作成判定フラグが未統一の場合、frontmatter 契約の補強が別途必要
- 既存 `scripts/harness/core/metadata-parser.ts` の移行互換を強く求める場合、段階移行用の adapter 実装が増える
