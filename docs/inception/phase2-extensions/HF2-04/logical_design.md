---
traceability:
  initial_creation: true
---

# 論理設計: HF2-04 initial-creation-expiration-checker

> **対応ストーリー**: HF2-04
> **作成日**: 2026-04-20
> **Unit**: phase2-extensions
> **関連 issue**: ISSUE-011 Wave 3 P3-4
> **前提ドキュメント**:
> - `docs/product/construction/phase2-extensions/logical_design.md`（Unit横断設計）
> - `docs/product/construction/phase2-extensions/domain_model.md`

---

## 概要

`traceability.initial_creation: true` を保持したまま長期放置されている設計文書を L4 validator として検出する。文書の **初回コミット日からの経過日数** と **累積コミット回数** のいずれかが閾値を超えた場合に WARN を出力し、frontmatter 削除漏れによる注釈 skip 経路の永続化を防ぐ。

既存 HF2-01 (doc-freshness-checker) は `git log --format=%ai -1`（最終更新日）をベースとするが、本 validator は `git log --diff-filter=A --format=%ai -- <path>`（初回追加コミット）を基準とする点で責務が異なる。独立した validator として新設する。

---

## ドメインモデル

@story-id HF2-04
### InitialCreationExpirationRule（新規集約ルート）

**責務**: `initial_creation: true` フラグ付き設計文書の失効判定ルールを表現する。

**不変条件**:
- `daysThreshold` は正の整数（0 不可）
- `commitCountThreshold` は正の整数（0 不可）
- `ruleId` は非空文字列
- `documentPattern` は glob パターン文字列

**属性**:
- `ruleId: string`
- `documentPattern: string`（例: `docs/**/*.md`）
- `daysThreshold: number`（経過日数閾値）
- `commitCountThreshold: number`（コミット回数閾値）
- `evaluationMode: 'or' | 'and'`（いずれか / 両方）
- `enabled: boolean`

---

@story-id HF2-04
### InitialCreationAge（新規 VO）

**責務**: 初回コミット日からの経過日数とコミット回数を保持する不変値。

**属性**:
- `ageInDays: number`（初回コミット日からの経過日数、0 以上）
- `commitCount: number`（対象ファイルへの累積コミット回数、1 以上）
- `source: 'git-log' | 'file-mtime'`（算出ソース。git 非管理下では file-mtime と commitCount=1）

**不変条件**:
- `ageInDays >= 0`
- `commitCount >= 1`

---

@story-id HF2-04
### InitialCreationExpirationCheckService（新規ドメインサービス）

**責務**: ルールと InitialCreationAge を受け取り、expiration を判定する純粋関数。

**シグネチャ**:
```ts
check(
  rule: InitialCreationExpirationRule,
  age: InitialCreationAge,
  documentPath: string,
): InitialCreationExpirationResult
```

**判定ロジック**:
- `rule.evaluationMode === 'or'`: `ageInDays >= daysThreshold || commitCount >= commitCountThreshold` → `warn`
- `rule.evaluationMode === 'and'`: 両方成立で `warn`
- ルール disabled または frontmatter が `initial_creation: true` でない場合は `ok`

---

@story-id HF2-04
### 新規ポート

| Port | 責務 |
|------|------|
| `InitialCreationExpirationConfigPort` | phasegate.config.json からルールを読み込む |
| `FrontmatterReaderPort` | 指定 md ファイルの frontmatter を解析し `initialCreation` フラグを返す |
| `InitialCreationAgePort` | 対象ファイルの初回コミット日とコミット回数を算出する（git log / file-mtime フォールバック） |

既存 `DocumentScannerPort`（HF2-01 で定義済み）を再利用する。

---

## ユースケース

@story-id HF2-04
### UC-HF2-04-01: initial_creation expiration を L4 で検証する

**As a** 品質管理者
**I want to** `npx phasegate validate --layer L4` 実行時に initial_creation 長期放置を検出する
**So that** 設計文書の trace skip 経路が恒常化する前に警告を受けられる

#### 事前条件
- `phasegate.config.json` にルール設定があるか、未指定時は default rule が適用される
- プロジェクトが git 管理されている（未管理ならファイル mtime fallback）

#### 基本フロー
1. Config からルールを読み込む
2. `DocumentScannerPort` で `documentPattern` にマッチする全 md ファイルを列挙
3. 各ファイルについて `FrontmatterReaderPort` で `initial_creation` を確認
4. `true` のファイルのみ `InitialCreationAgePort` で age と commit count を取得
5. `InitialCreationExpirationCheckService.check()` で判定
6. `warn` の結果を HarnessError `L4-231` として集約し、`CheckInitialCreationExpirationOutput` に投影

#### 例外フロー
- config 読み込み失敗 → `L4-299` error で終了
- git log 失敗 → file mtime + commitCount=1 fallback
- frontmatter YAML 不正 → 該当ファイルをスキップしつつ `L4-232` warn を追加（個別ファイル失敗で全体を落とさない）

---

## 層構成（Clean Architecture）

```
phase2-extensions/
├── domain/
│   ├── aggregates/
│   │   └── initial-creation-expiration-rule.ts        # 新規集約
│   ├── value-objects/
│   │   └── initial-creation-age.ts                    # 新規VO
│   ├── services/
│   │   └── initial-creation-expiration-check-service.ts  # 新規ドメインサービス
│   └── ports/
│       ├── initial-creation-expiration-config-port.ts    # 新規ポート
│       ├── frontmatter-reader-port.ts                    # 新規ポート
│       └── initial-creation-age-port.ts                  # 新規ポート
├── application/
│   ├── usecases/
│   │   └── check-initial-creation-expiration-usecase.ts  # 新規UseCase
│   └── dto/
│       ├── check-initial-creation-expiration-input.ts
│       └── check-initial-creation-expiration-output.ts
├── infrastructure/
│   └── adapters/
│       ├── harness-config-initial-creation-expiration-adapter.ts  # 新規（Config→Rule）
│       ├── markdown-frontmatter-reader-adapter.ts                 # 新規（fs + frontmatter-flag-parser 再利用）
│       └── git-log-initial-creation-age-adapter.ts                # 新規（git log --diff-filter=A）
└── presentation/
    └── handlers/
        └── check-initial-creation-expiration-handler.ts           # 新規CLIハンドラー
```

---

## 外部依存と既存実装との関係

### 既存パーサー再利用
- `scripts/harness/traceability-model/infrastructure/parsers/frontmatter-flag-parser.ts` を `MarkdownFrontmatterReaderAdapter` から直接 import する（Unit 間 infrastructure 依存を 1 点に限定）
- 将来 traceability-model 側が frontmatter schema を拡張する場合に追従できるよう、adapter で wrap する

### HF2-01 との比較

| 観点 | HF2-01 (doc-freshness-checker) | HF2-04 (本 validator) |
|------|-------------------------------|----------------------|
| 起点 | 最終更新日（最新コミット） | 初回コミット日 |
| git コマンド | `git log --format=%ai -1 -- <path>` | `git log --diff-filter=A --format=%ai -- <path>` |
| 追加指標 | なし | コミット回数 (`git rev-list --count HEAD -- <path>`) |
| 対象判定 | 全 md 無差別 | `initial_creation: true` のみ |
| severity | warn / error | warn 固定（段階導入） |

---

## HarnessError コード割り当て

| Code | 意味 | severity | 対応アクション |
|------|------|----------|---------------|
| `L4-231` | initial_creation expiration (閾値超過) | `warning` | frontmatter を削除し、累積更新として @story-id 注釈を付与する |
| `L4-232` | frontmatter parse 失敗（個別スキップ） | `warning` | YAML 構文を確認する |
| `L4-299` | config load 失敗（既存共通コード） | `error` | phasegate.config.json を確認する |

---

## Config スキーマ拡張

```jsonc
{
  "phase2Extensions": {
    "initialCreationExpirationRules": [
      {
        "ruleId": "default-initial-creation-expiration",
        "documentPattern": "docs/**/*.md",
        "daysThreshold": 90,
        "commitCountThreshold": 5,
        "evaluationMode": "or",
        "enabled": true
      }
    ]
  }
}
```

### デフォルト値（config 未指定時）
- `daysThreshold: 90`
- `commitCountThreshold: 5`
- `evaluationMode: 'or'`
- `documentPattern: 'docs/**/*.md'`
- `enabled: true`

---

## トレーサビリティメタデータの使い方

- 新規作成ドキュメントのため `initial_creation: true` を付与（上 frontmatter 参照）
- 2 回目改訂時に frontmatter を削除し、各 `@story-id HF2-04` インライン注釈のみで trace を維持する
