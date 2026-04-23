# ISSUE-022: Unit barrel (`**/index.ts`) が `no-layer-violation` で誤検知される

## ステータス

- **状態**: 🟢 CLOSED (v0.85.0, 2026-04-23)
- **起票日**: 2026-04-23
- **発見契機**: ISSUE-017（v0.83.0）の `extractImports` 修正で `export ... from` 再帰走査が有効化された結果、`quick-mode/index.ts` の barrel 再エクスポートが 7 件の `L1-003 no-layer-violation` を新規露出
- **影響Unit**: biome-ast-engine（`rule-definition-registry.ts` の `no-layer-violation.ignorePatterns`）
- **深刻度**: Low — ルール設定の漏れによる誤検知。実害は false positive のみ（設計上正しい barrel が flag される）
- **優先度**: P3（即時解消可能）

## 問題の概要

Unit ごとの公開 API barrel（`scripts/harness/<unit>/index.ts`）は、Unit の facade として `domain / application / infrastructure / presentation` 全層からの re-export を行うのが設計上の役割。これは概念的に **composition root / entry point** であり、`main.ts` / `composition-root.ts` / `presentation/*-hook.ts` と同じ性質。

現行の `no-layer-violation.ignorePatterns`（`scripts/harness/biome-ast-engine/domain/services/rule-definition-registry.ts:133-138`）:

```typescript
ignorePatterns: Object.freeze([
  '**/shared-kernel/**',
  '**/composition-root.ts',
  '**/main.ts',
  '**/presentation/*-hook.ts',
]),
```

→ entry point 系は既に除外されているが、**Unit barrel (`**/index.ts`) が漏れている**。

### 該当違反（v0.84.0 時点、7 件）

全て `scripts/harness/quick-mode/index.ts` から：

| to | count |
|---|---|
| `infrastructure/adapters/git-diff-changed-files-adapter.ts` | 1 |
| `infrastructure/adapters/harness-config-quick-mode-config-adapter.ts` | 1 |
| `infrastructure/adapters/validator-system-validator-id-registry-adapter.ts` | 1 |
| `presentation/handlers/ci-check-quick-mode-handler.ts` | 1 |
| `presentation/formatters/human-quick-mode-formatter.ts` | 1 |
| `presentation/formatters/agent-quick-mode-formatter.ts` | 1 |
| `presentation/formatters/json-quick-mode-formatter.ts` | 1 |

`quick-mode/index.ts` は `@layer application` タグで、Unit の公開 API を一括 re-export しており、application 層から infrastructure / presentation を参照する形になっている。これは barrel の構造上必然で、実害なし。

### 副作用リスクの確認

`scripts/harness/*/index.ts` は Unit barrel のみ（sub-layer barrel は存在しない）:

```
scripts/harness/biome-ast-engine/index.ts
scripts/harness/harness-api/index.ts
scripts/harness/validator-system/index.ts
scripts/harness/quick-mode/index.ts
scripts/harness/adr-foundation/index.ts
scripts/harness/phase-dependency-model/index.ts
scripts/harness/traceability-model/index.ts
scripts/harness/config-foundation/index.ts
scripts/harness/harness-error/index.ts
scripts/harness/nyquist-validation/index.ts
scripts/harness/agent-integration/index.ts
```

`**/index.ts` パターンは全て Unit barrel にマッチし、他のファイルに誤適用される心配なし。

## 修正案

`rule-definition-registry.ts` の `no-layer-violation.ignorePatterns` に `'**/index.ts'` を追加:

```diff
 ignorePatterns: Object.freeze([
   '**/shared-kernel/**',
   '**/composition-root.ts',
   '**/main.ts',
   '**/presentation/*-hook.ts',
+  '**/index.ts',
 ]),
```

### Acceptance criteria

- [ ] `no-layer-violation.ignorePatterns` に `'**/index.ts'` が追加される
- [ ] `npx phasegate lint` の L1-003 違反が 15 → 8 に減少
- [ ] 残 8 件が全て `presentation → domain` パターン（ISSUE-019 スコープ）であることを確認
- [ ] 既存テスト全 green

## 関連

- **ISSUE-017**（v0.83.0 CLOSED）: この barrel 違反を露出させた `extractImports` の修正元。barrel 7 件は ISSUE-017 の副次効果として想定済み
- **ISSUE-019**（議論中）: 残 8 件の `presentation → domain` は別性質（philosophical 案件）で本 issue とはスコープ分離
- **ISSUE-014**（P2）: アーキ config 化で ignorePatterns 自体もユーザー設定可能にする予定 — 本 issue のデフォルト追加は ISSUE-014 とは独立に進める
