---
id: WI-023
type: issue
severity: normal
status: tested
legacy_id: ISSUE-023
affects: [traceability-model]
---

# ISSUE-023: `StoryId` validator pattern が `HF\d+-\d{2}` を拒否する

## ステータス

- **状態**: 🟢 **CLOSED (v0.91.0)**
- **優先度**: P2（ISSUE-010 完全解消の前提）
- **起票日**: 2026-04-23
- **解消日**: 2026-04-23
- **発見契機**: ISSUE-010 Wave 3（v0.89.0）進行中に `phase2-extensions` Unit（`HF2-XX`）の 7 設計文書が `@story-id は必須です` で FAIL 判定されることを発見。fuse-hooks-engine Unit 削除（v0.90.0）後も同 7 件が残っていた

## 問題の概要

`scripts/harness/traceability-model/domain/value-objects/story-id.ts` の

```ts
const STORY_ID_PATTERN = /^H(?<epicNumber>[0-9]{2})-(?<storyNumber>[0-9]{2})$/;
```

および `scripts/harness/traceability-model/domain/services/metadata-validator.ts:16` の

```ts
const STORY_ID_PATTERN = /^H[0-9]{2}-[0-9]{2}$/;
```

は `H01-01` 〜 `H99-99` の 2 桁 Epic 番号のみを許容し、`HF1-XX` / `HF2-XX` 形式（Phase 2 拡張 Epic）を拒否する。

一方で `docs/product/user_stories.md` では `HF2-01` 〜 `HF2-04` が第一級のストーリー ID として定義されており、`scripts/harness/__tests__/integration/phase2-extensions/` 配下の 5 テストファイルも `// @story HF2-04` 形式を使用している。

これにより:

1. `docs/product/construction/phase2-extensions/*.md` の 7 設計文書で `@story-id HF2-XX` 注釈が validator 側で silent drop され、ISSUE-010 の FAIL 判定が残る
2. `scripts/harness/__tests__/**/phase2-extensions/*.test.ts` の `@story HF2-04` タグが `validateTest` で「HXX-XX 形式ではありません」エラー

## 対応内容（v0.91.0 で実施）

### `story-id.ts`
- `STORY_ID_PATTERN` を `/^H(?<epicNumber>F\d+|\d{2})-(?<storyNumber>\d{2})$/` に拡張
- `epicNumber` の意味: 2 桁数字（従来） or `F<数字>`（Phase 2 拡張 Epic）
- 外部 API（`parse` / `isValid` / `getEpicNumber` / `getStoryNumber` / `equals`）は不変
- エラーメッセージ: `StoryIdはHXX-XX形式で指定してください` → `StoryIdはHXX-XX形式（HF\d+-XX も可）で指定してください`

### `metadata-validator.ts`
- `STORY_ID_PATTERN` を `/^H(?:F\d+|\d{2})-[0-9]{2}$/` に同期

### テスト
- `scripts/harness/__tests__/unit/traceability-model/story-id.test.ts` に HF prefix ケースを追加
  - `StoryId.parse('HF2-04')` が成功すること
  - `getEpicNumber()` が `'F2'` を返すこと
  - `getStoryNumber()` が `'04'` を返すこと

## 受け入れ基準

- [x] `StoryId.parse('HF2-04')` が成功する
- [x] `StoryId.parse('HF10-99')` が成功する（forward-compat）
- [x] `StoryId.parse('H01-01')` の既存挙動は不変
- [x] `validate-metadata docs/product/construction/phase2-extensions/*.md` の FAIL が 0 件
- [x] `validate-metadata scripts/harness/__tests__/**/phase2-extensions/*.test.ts` の FAIL が 0 件
- [x] 既存 3308 件テスト regression なし
- [x] `npx phasegate lint` violations 0 件維持

## 副次効果

- ISSUE-010 が完全 CLOSE（`validate-metadata` FAIL: 7 → 0）
- `phase2-extensions` の `@story` タグを持つ integration/unit テスト（5 件）が validate-metadata PASS

## 関連

- ISSUE-010: 既存設計文書 103 件への `@story-id` 注釈段階的補填（本 issue で残 7 件を解消し完全 CLOSE）
- `MetadataValidator.validateDesignDocument`: 本 pattern を間接的に使用（StoryIdAnnotation 生成段階で silent drop）
- `MetadataValidator.validateTest`: 本 pattern を直接使用（`@story` タグ検証）
