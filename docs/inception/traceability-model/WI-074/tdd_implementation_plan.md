# TDD 実装計画: H03-04 WorkItem frontmatter parser 追加

@story-id H03-04
設計要素: UT-TM-W01〜W10 の 10 ケースを RED → GREEN → REFACTOR で実装。domain 値オブジェクト + infrastructure pure function + error class のセット。

- **対応ストーリー**: H03-04
- **対応 Issue**: ISSUE-026 (Phase A-2)
- **Unit**: traceability-model
- **作成日**: 2026-04-24

## 1. スコープ

### 1.1 対象ストーリー受け入れ基準

H03-04 AC-1〜AC-10（`docs/product/user_stories.md` 参照）。

### 1.2 影響する層

| 層 | 影響 | 新規ファイル |
|---|------|------------|
| domain | **あり** | `scripts/harness/traceability-model/domain/value-objects/work-item-frontmatter.ts` |
| application | なし | — |
| infrastructure | **あり** | `scripts/harness/traceability-model/infrastructure/parsers/work-item-frontmatter-parser.ts` |
| presentation | なし | — |
| テスト（unit） | **あり** | `scripts/harness/__tests__/unit/traceability-model/work-item-frontmatter-parser.test.ts` |

## 2. 前提条件検証

- `implementation-readiness-checker` 実行日時: **2026-04-24**（メインセッション手動実行）
- 判定結果: **✅ 実装準備完了**

## 3. TDD 実装順序

本ストーリーは pure function + domain value object のみ。Unit テストで完結。IT / シナリオ不要。

### Step 3.1 domain 値オブジェクト定義（先行コミット）

ファイル: `scripts/harness/traceability-model/domain/value-objects/work-item-frontmatter.ts`

```ts
// @unit traceability-model
// @layer domain

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

export const WORK_ITEM_ID_PATTERN =
  /^(?:WI-\d+|H(?:\d{2}|F\d+)-\d{2}|ISSUE-\d+)$/;
export const WORK_ITEM_TYPES: ReadonlySet<WorkItemType> = new Set([
  'story', 'issue', 'fix', 'refactor', 'chore',
]);
export const WORK_ITEM_SEVERITIES: ReadonlySet<WorkItemSeverity> = new Set([
  'trivial', 'normal', 'high',
]);
export const WORK_ITEM_STATUSES: ReadonlySet<WorkItemStatus> = new Set([
  'drafted', 'reflected', 'implemented', 'tested',
]);
```

**この step は型定義のみで振る舞いを持たないため、テスト不要**。

### Step 3.2 Unit テスト (RED)

ファイル: `scripts/harness/__tests__/unit/traceability-model/work-item-frontmatter-parser.test.ts`

UT-TM-W01〜W10 の 10 ケース。AAA パターン。AC-1〜AC-10 を 1:1 で検証。

### Step 3.3 infrastructure 実装 (GREEN)

ファイル: `scripts/harness/traceability-model/infrastructure/parsers/work-item-frontmatter-parser.ts`

```ts
// @unit traceability-model
// @layer infrastructure

import {
  type WorkItemFrontmatter,
  type WorkItemType,
  type WorkItemSeverity,
  type WorkItemStatus,
  WorkItemFrontmatterValidationError,
  WORK_ITEM_ID_PATTERN,
  WORK_ITEM_TYPES,
  WORK_ITEM_SEVERITIES,
  WORK_ITEM_STATUSES,
} from '../../domain/value-objects/work-item-frontmatter.js';

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---/;
const SCALAR_PATTERN = (key: string) =>
  new RegExp(`^\\s*${key}\\s*:\\s*(.+?)\\s*$`, 'm');
const FLOW_ARRAY_PATTERN = (key: string) =>
  new RegExp(`^\\s*${key}\\s*:\\s*\\[([^\\]]*)\\]\\s*$`, 'm');
const BLOCK_ARRAY_PATTERN = (key: string) =>
  new RegExp(
    `^\\s*${key}\\s*:\\s*\\r?\\n((?:\\s+-\\s+.+\\r?\\n?)+)`,
    'm',
  );

export function parseWorkItemFrontmatter(
  content: string,
): WorkItemFrontmatter | null {
  const match = FRONTMATTER_PATTERN.exec(content);
  if (!match) return null;

  const body = match[1];

  const id = extractScalar(body, 'id');
  const type = extractScalar(body, 'type');

  if (!id) throw new WorkItemFrontmatterValidationError('id が不足しています');
  if (!type) throw new WorkItemFrontmatterValidationError('type が不足しています');

  if (!WORK_ITEM_ID_PATTERN.test(id)) {
    throw new WorkItemFrontmatterValidationError(`id 形式が不正です: ${id}`);
  }
  if (!WORK_ITEM_TYPES.has(type as WorkItemType)) {
    throw new WorkItemFrontmatterValidationError(`type 値が enum 外: ${type}`);
  }

  const severity = extractScalar(body, 'severity');
  if (severity !== undefined && !WORK_ITEM_SEVERITIES.has(severity as WorkItemSeverity)) {
    throw new WorkItemFrontmatterValidationError(`severity 値が enum 外: ${severity}`);
  }

  const status = extractScalar(body, 'status');
  if (status !== undefined && !WORK_ITEM_STATUSES.has(status as WorkItemStatus)) {
    throw new WorkItemFrontmatterValidationError(`status 値が enum 外: ${status}`);
  }

  const affects = extractArray(body, 'affects');
  const source = extractScalar(body, 'source');
  const legacyId = extractScalar(body, 'legacy_id');

  return {
    id,
    type: type as WorkItemType,
    ...(affects && { affects }),
    ...(severity && { severity: severity as WorkItemSeverity }),
    ...(status && { status: status as WorkItemStatus }),
    ...(source && { source }),
    ...(legacyId && { legacyId }),
  };
}

function extractScalar(body: string, key: string): string | undefined {
  const m = SCALAR_PATTERN(key).exec(body);
  if (!m) return undefined;
  const raw = m[1].trim();
  if (raw.length === 0) return undefined;
  // 配列記法や block indicator は scalar 抽出から除外
  if (raw.startsWith('[')) return undefined;
  return stripYamlQuotes(raw);
}

function extractArray(body: string, key: string): readonly string[] | undefined {
  // flow 記法: affects: [a, b]
  const flow = FLOW_ARRAY_PATTERN(key).exec(body);
  if (flow) {
    return flow[1]
      .split(',')
      .map((s) => stripYamlQuotes(s.trim()))
      .filter((s) => s.length > 0);
  }
  // block 記法:
  //   affects:
  //     - a
  //     - b
  const block = BLOCK_ARRAY_PATTERN(key).exec(body);
  if (block) {
    return block[1]
      .split(/\r?\n/)
      .map((line) => line.replace(/^\s+-\s+/, '').trim())
      .map(stripYamlQuotes)
      .filter((s) => s.length > 0);
  }
  return undefined;
}

function stripYamlQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}
```

### Step 3.4 REFACTOR

- 共通 FRONTMATTER_PATTERN は既存 `frontmatter-flag-parser.ts` と同じ。**抽出は行わない**（両者独立を維持）
- YAML quoting の広範な対応（エスケープ等）は本ストーリー非対象。最小限に留める

### Step 3.5 回帰確認

```bash
npm run test -- work-item-frontmatter-parser.test
npm run test
npx phasegate lint
```

- 対象テスト単体 10 ケース green
- 全テスト suite 退行なし
- L1 lint violations 0

## 4. 環境検証チェックリスト

- [x] Node / Vitest 環境: 既存 CI と同じ
- [x] 既存 `parseFrontmatterFlags` テスト: 無変更
- [x] 他 Unit への波及なし

## 5. QA（不明点・確認事項）

なし。pure function + value object のみ。

## 6. 前提条件・リスク

| リスク | 影響度 | 緩和策 |
|------|------|------|
| YAML edge case（複数行 string, anchor, tagged type）で誤動作 | 低 | 本ストーリーは WI frontmatter の「単純 key: value + flat list」のみ対応。edge case は明示的非対象 |
| `legacy_id` 値のバリエーション（US-XXX 等）で parser が拒否 | 低 | `legacy_id` は free string として受容（validation なし） |
| `parseFrontmatterFlags` と `parseWorkItemFrontmatter` で frontmatter 解釈が矛盾 | 低 | 両者独立実装・読み取り専用のため、矛盾があっても副作用なし |

## 7. コミット分割方針

1. `feat: H03-04 WorkItemFrontmatter 型と定数を domain 層に追加`
2. `test: H03-04 parseWorkItemFrontmatter ユニットテスト追加 (RED)`
3. `feat: H03-04 parseWorkItemFrontmatter infrastructure 実装 (GREEN)`

実行上は 3 コミットを 1 コミットに圧縮しても良い（型定義→テスト→実装は密結合のため）。

---

## Phase 2 開始条件

- 本計画をユーザーがレビューし **承認**
- QA セクションに未解決 [Question] が残っていないこと（現状なし）

承認後、Step 3.1 → 3.2 → 3.3 → 3.5 の順で実装する。
