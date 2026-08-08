---
id: WI-016
type: issue
severity: normal
status: drafted
legacy_id: ISSUE-016
affects: [biome-ast-engine（主）]
---

# ISSUE-016: `no-layer-violation` (L1-003) rule が `ignorePatterns` config を読まず dead code 化している

## ステータス

- **状態**: 🟢 **CLOSED (v0.79.0, 2026-04-23)** — `ImportGraph.findLayerViolations` に `ignorePatterns` を配線、dead code 化解消。v0.85.0 (ISSUE-022) で `**/index.ts` 追加、v0.86.0 (ISSUE-019) で presentation→domain 許容化の基盤として機能
- **起票日**: 2026-04-23
- **発見契機**: ISSUE-003 Wave 2b（L1-004 enforce-folder-structure 修正）の実装調査中に発覚。`rule-definition-registry.ts:114` で `no-layer-violation` に `ignorePatterns: ['**/shared-kernel/**']` が定義されているにもかかわらず、`lint-runner.ts:99-120` の該当 case は config を一切読まず、`ImportGraph.findLayerViolations()` も `ignorePatterns` 引数を受け付けない設計
- **影響Unit**: biome-ast-engine（主）
- **深刻度**: Medium — 設定が dead code であることは重大な integrity 問題だが、実害は「shared-kernel が L1-003 の対象外にならない（期待と異なる）」に留まる
- **優先度**: P2 — ISSUE-003 Wave 4（L1-003 63件解消）の着手前提として解決が必要

### 解消サマリ (v0.79.0)

- `ImportGraph.findLayerViolations` に第 3 引数 `ignorePatterns` (default `[]`) を追加 — pattern match した `from` 由来 edge は評価前に除外
- `lint-runner.ts` の `no-layer-violation` case で `rule.config.ignorePatterns` を読み取り `findLayerViolations` に渡す
- 新規 unit test 2 件追加（ignorePatterns で edge 除外 / 空配列で従来挙動）— 既存 3297 件含め 3299 件 green
- 件数変化: 66 → 66（shared-kernel 由来 violation が現存しないため不変）。Wave 4 の ignorePatterns 拡張で効果発揮予定

## 問題の概要

`no-layer-violation` ルールは他ルールと同じ形式で `ignorePatterns` config を持つが、実装が追従していない。

### 現状（直接確認済み）

**`scripts/harness/biome-ast-engine/domain/services/rule-definition-registry.ts:110-117`**:
```typescript
createCatalogEntry(
  'no-layer-violation',
  'L1-003',
  Object.freeze([REQUIRED_INPUT.sourceModuleSnapshots, REQUIRED_INPUT.importGraph]),
  Object.freeze({ ignorePatterns: Object.freeze(['**/shared-kernel/**']) }),
  'レイヤー違反を検出する',
  '依存方向をアーキテクチャ方針に合わせる'
),
```

`ignorePatterns: ['**/shared-kernel/**']` が定義されている。

**`scripts/harness/biome-ast-engine/domain/services/lint-runner.ts:99-120`**:
```typescript
case 'no-layer-violation': {
  for (const edge of params.importGraph.findLayerViolations(
    LayerBoundary.standardMatrix(),
    layerByFile
  )) {
    const fromSnapshot = snapshotByPath.get(edge.from.toString());
    if (fromSnapshot && isTestFile(fromSnapshot)) {
      continue;
    }
    ruleViolations.push(
      RuleViolation.create({
        filePath: edge.from,
        ...
```

`rule.config` を一切参照せず、`findLayerViolations(boundaries, layerByFile)` の 2 引数のみで呼び出し。

**`scripts/harness/biome-ast-engine/domain/value-objects/import-graph.ts:170-190`**:
```typescript
findLayerViolations(
  boundaries: readonly LayerBoundary[],
  layerByFile: ReadonlyMap<string, LayerName>
): readonly ImportEdge[] {
  return Object.freeze(
    this.edges.filter((edge) => {
      ...
    })
  );
}
```

`ignorePatterns` パラメータの受け口が存在しない。

### 対比: 正常に動作している rule

| Rule | config | lint-runner での読み取り | 動作 |
|---|---|---|---|
| `no-ghost-file` (L1-006) | `ignorePatterns: ['**/*.test.ts', '**/*.spec.ts']` | `toStringArray(rule.config.ignorePatterns, ...)` で読み取り、`ImportGraph.findGhostFiles(ignorePatterns)` に渡す | ✅ 機能している |
| `enforce-folder-structure` (L1-004) | v0.77.0 で `ignorePatterns` 追加 | v0.77.0 で対応済（Wave 2b） | ✅ 機能している |
| **`no-layer-violation` (L1-003)** | `ignorePatterns: ['**/shared-kernel/**']` | **読まず** | ❌ **dead code** |

### 影響シナリオ

- `scripts/harness/shared-kernel/harness-api.ts` などの Shared Kernel ファイルが層違反 import を持つ場合、現状では L1-003 を発火させる（expected: ignore）
- 他プロジェクトが phasegate 導入時に「shared-kernel/** は L1-003 から除外される」と期待しても実際はスキップされない
- ISSUE-003 Wave 4 で composition-root / main.ts / hook を `ignorePatterns` に追加しても効かない

## 修正案

Wave 2b（v0.77.0）と同じ構造で:

**A. `ImportGraph.findLayerViolations` に `ignorePatterns` 引数を追加**
```typescript
findLayerViolations(
  boundaries: readonly LayerBoundary[],
  layerByFile: ReadonlyMap<string, LayerName>,
  ignorePatterns: readonly string[] = []
): readonly ImportEdge[] {
  return Object.freeze(
    this.edges.filter((edge) => {
      const fromStr = edge.from.toString();
      if (ignorePatterns.some((pattern) => matchesPattern(fromStr, pattern))) {
        return false;
      }
      ...
    })
  );
}
```

**B. `lint-runner.ts` の `no-layer-violation` case を update**
```typescript
case 'no-layer-violation': {
  const ignorePatterns = toStringArray(rule.config.ignorePatterns, Object.freeze([]));
  for (const edge of params.importGraph.findLayerViolations(
    LayerBoundary.standardMatrix(),
    layerByFile,
    ignorePatterns,
  )) {
    ...
```

**C. 既存テストの更新**
- `ImportGraph.findLayerViolations` の既存テストは 2 引数で呼んでいるはず（default 値 `[]` で後方互換）
- 新規テスト: `ignorePatterns` で特定 edge が除外されることの検証

### Acceptance criteria

- [ ] `ignorePatterns: ['**/shared-kernel/**']` 設定下で shared-kernel から他レイヤーへの import が L1-003 を発火しない
- [ ] 空 `ignorePatterns` の場合、従来通り全 edge が評価される
- [ ] 既存テスト全て green（3297 件）
- [ ] 新規 unit test: `findLayerViolations(_, _, ignorePatterns)` の挙動検証

### 実装フェーズ

| Phase | 内容 | 見積り |
|---|---|---|
| A | `ImportGraph.findLayerViolations` 拡張 + unit test | 0.5h |
| B | `lint-runner` `no-layer-violation` case 更新 | 0.25h |
| C | 既存テスト検証 + 新規 test 追加 | 0.25h |
| D | `phasegate lint` 実機確認（L1-003 件数変化記録） | 0.25h |

**合計見積り**: ~1.5h（quick-implementor scope: `bugfix`）

## ISSUE-003 Wave 4 との関係

本 issue 解決後、Wave 4 では `no-layer-violation` rule の `ignorePatterns` を以下に拡張することで composition-root / main.ts 由来の L1-003 違反（37件）を一括解消できる:

```typescript
ignorePatterns: Object.freeze([
  '**/shared-kernel/**',
  '**/composition-root.ts',
  '**/main.ts',
])
```

**本 issue 解決前は Wave 4 を着手できない**（config を書いても効かないため）。

## 参照

- `scripts/harness/biome-ast-engine/domain/services/rule-definition-registry.ts:110-117`（dead config）
- `scripts/harness/biome-ast-engine/domain/services/lint-runner.ts:99-120`（config 未読）
- `scripts/harness/biome-ast-engine/domain/value-objects/import-graph.ts:170-190`（引数なし）
- `scripts/harness/biome-ast-engine/domain/value-objects/import-graph.ts:192-208`（`findGhostFiles` の正しい実装、参考）
- v0.77.0 commit 98b3e46（`enforce-folder-structure` での同様修正）
- 関連 issue: ISSUE-003 Wave 4 の前提
