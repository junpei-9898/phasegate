# 論理設計: H03-04 WorkItem frontmatter parser 追加

@story-id H03-04
設計要素: `WorkItemFrontmatter` 型 + `parseWorkItemFrontmatter(content)` 関数 + `WorkItemFrontmatterValidationError` を traceability-model に追加。

- **対応ストーリー**: H03-04
- **対応 Issue**: ISSUE-026 (Phase A-2)
- **Unit**: traceability-model
- **作成日**: 2026-04-24

## 1. 現状

`traceability-model/infrastructure/parsers/frontmatter-flag-parser.ts` は `traceability.initial_creation: true/false` のみ抽出する専用 parser であり、他の frontmatter フィールドは一切解釈しない。

```ts
// 現状の API
export function parseFrontmatterFlags(content: string): ParsedFrontmatterFlags;
// → { initialCreation: boolean }
```

ISSUE-026 で採用した WI 一本化では、各 WI ディレクトリ配下の `description.md` 先頭に以下の frontmatter が期待される:

```yaml
---
id: WI-026
type: story | issue | fix | refactor | chore
affects: [phase-dependency-model, agent-integration]
severity: trivial | normal | high
status: drafted | reflected | implemented | tested
source: github#123 | slack | internal
legacy_id: ISSUE-026
---
```

## 2. 追加する要素

### 2.1 domain 層: `WorkItemFrontmatter` 値オブジェクト

```ts
// scripts/harness/traceability-model/domain/value-objects/work-item-frontmatter.ts
export type WorkItemType = 'story' | 'issue' | 'fix' | 'refactor' | 'chore';
export type WorkItemSeverity = 'trivial' | 'normal' | 'high';
export type WorkItemStatus = 'drafted' | 'reflected' | 'implemented' | 'tested';

export interface WorkItemFrontmatter {
  readonly id: string;
  readonly type: WorkItemType;
  readonly affects?: readonly string[];
  readonly severity?: WorkItemSeverity;
  readonly status?: WorkItemStatus;
  readonly source?: string;
  readonly legacyId?: string;
}

export class WorkItemFrontmatterValidationError extends Error {
  constructor(reason: string) {
    super(`WorkItem frontmatter が不正です: ${reason}`);
    this.name = 'WorkItemFrontmatterValidationError';
  }
}
```

- `id` 形式は `WI-\d+` / `H\d{2}-\d{2}` / `HF\d+-\d{2}` / `ISSUE-\d+` のいずれかに合致必須
- `type` は enum。enum 外は error

### 2.2 infrastructure 層: `parseWorkItemFrontmatter` 関数

```ts
// scripts/harness/traceability-model/infrastructure/parsers/work-item-frontmatter-parser.ts
export function parseWorkItemFrontmatter(
  content: string,
): WorkItemFrontmatter | null;
```

- frontmatter 不在時 → `null`
- 必須キー (`id` / `type`) 欠落時 → throw
- enum 違反時 → throw
- 既存の `parseFrontmatterFlags` とは**独立**（互いに呼び出さない）

### 2.3 実装方針

- 既存 `FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---/` を共通 helper に切り出して両 parser で流用
- Key 値抽出は gray-matter 非依存で、`/^\s*{key}\s*:\s*(.+)\s*$/m` 系の simple regex で行う
- `affects` (array) は `/^\s*affects\s*:\s*\r?\n((?:\s+-\s+.+\r?\n?)+)/` または YAML フラットリスト `[a, b, c]` の両対応

## 3. 影響範囲

| ファイル | 変更種別 | 内容 |
|---------|--------|------|
| `scripts/harness/traceability-model/domain/value-objects/work-item-frontmatter.ts` | 追加 | 型定義 + Error クラス |
| `scripts/harness/traceability-model/infrastructure/parsers/work-item-frontmatter-parser.ts` | 追加 | `parseWorkItemFrontmatter` 実装 |
| `scripts/harness/__tests__/unit/traceability-model/work-item-frontmatter-parser.test.ts` | 追加 | UT-TM-W01〜W10 |

**影響外**:
- `parseFrontmatterFlags` の既存実装・API・テスト
- metadata-validator の振る舞い
- design-document-port / markdown-design-document-gateway

## 4. テスト戦略（概略）

UT-TM-W01〜W10 はすべて pure function テスト。外部 I/O なし、tmp dir 不要、文字列入力で完結する。

## 5. 非機能要件

- 性能: O(n) regex マッチング（n = content 長）。既存 `parseFrontmatterFlags` と同等
- メモリ: frontmatter block の部分文字列のみ保持
