# ISSUE-017: `extractImports` が `export ... from` re-export と nested dynamic import を捕捉せず、ghost-file 検出に false positive が発生する

## ステータス

- **状態**: 🟢 **CLOSED (v0.83.0, 2026-04-23)** — `extractImports` に `ts.isExportDeclaration` ブランチを追加、`ts.forEachChild` の浅い走査を再帰走査に置換。`quick-mode/domain/ports/changed-files-port.ts` の L1-006 ghost false positive 解消（L1-006: 2 → 1）。副作用として従来隠れていた barrel 再エクスポートの実アーキ違反 7 件が L1-003 に露出（8 → 15）— これは検出精度向上の結果であり ISSUE-019 文脈で追跡。
- **起票日**: 2026-04-23
- **発見契機**: ISSUE-003 Wave 3（L1-006 no-ghost-file 解消）で、`quick-mode/domain/ports/changed-files-port.ts` が実際には `application/ports/changed-files-port.ts` 経由で `export { ChangedFilesPort } from '../../domain/...'` 再エクスポートされているにもかかわらず ghost 判定された
- **影響Unit**: biome-ast-engine（主）
- **深刻度**: Medium — `no-ghost-file` (L1-006) に false positive が発生する。現在 ISSUE-003 Wave 3 残余 1 件の原因で、将来 barrel 構成を採用する Unit では同様の false positive が再発する
- **優先度**: P2

## 問題の概要

`scripts/harness/biome-ast-engine/infrastructure/adapters/typescript-source-module-analyzer-adapter.ts:85-152` の `extractImports` は **`ts.isImportDeclaration`** と **トップレベルの `ts.isCallExpression`（dynamic import）** しか捕捉していない。以下が完全に未対応:

### 未対応パターン

| パターン | 例 | 現状 |
|---|---|---|
| 値 re-export | `export { Foo } from './foo.js'` | ❌ edge 生成されず |
| 型 re-export | `export type { Foo } from './foo-type.js'` | ❌ edge 生成されず |
| 名前空間 re-export | `export * from './utils.js'` | ❌ edge 生成されず |
| エイリアス re-export | `export { Foo as Bar } from './foo.js'` | ❌ edge 生成されず |
| 関数内 dynamic import | `async function f() { await import('./adapter.js'); }` | ❌ edge 生成されず（`forEachChild` は直下の子ノードしか見ない） |

### コードの現状

**`typescript-source-module-analyzer-adapter.ts:88-152`**（該当箇所、抜粋）:
```typescript
ts.forEachChild(sourceFile, (node) => {
  if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
    // ... import 文の処理（value / type 区別あり）
  }

  if (
    ts.isCallExpression(node) &&
    node.expression.kind === ts.SyntaxKind.ImportKeyword &&
    node.arguments.length > 0 &&
    ts.isStringLiteral(node.arguments[0])
  ) {
    // ... 「トップレベル」の import() のみ処理
  }
});
```

- `ts.isExportDeclaration` を検査するブランチがない
- `forEachChild` は sourceFile の直下の子ノードのみ走査するため、関数内の dynamic import は取り逃す

### false positive の具体例

**`scripts/harness/quick-mode/application/ports/changed-files-port.ts`** は domain port を再エクスポートする barrel:
```typescript
export { ChangedFilesPort } from '../../domain/ports/changed-files-port.js';
```

他の `application/usecases/*.ts` は `application/ports/changed-files-port.ts` から `import type { ChangedFilesPort }` している。したがって:

- `application/ports/changed-files-port.ts` には incoming edge（usecase から）がある → ghost 扱いされない
- `domain/ports/changed-files-port.ts` は `export ... from` 先として参照されているが、その edge が生成されない → 参照 0 件扱い → **ghost 判定**

**結果**: 実際には使われているのに L1-006 violation として報告される。

### 関数内 dynamic import の具体例

**`harness-api/infrastructure/adapters/nyquist-validation-impact-analysis-adapter.ts:31`**:
```typescript
async someMethod() {
  const { createNyquistValidationModule } = await import('../../../nyquist-validation/composition-root.js');
  // ...
}
```

この lazy loading も現状は捕捉されない。`composition-root.ts` は今回 `entryPointPatterns` に `**/composition-root.ts` を追加したことで ghost 判定を回避したが、それ以外の lazy 依存は依然として false positive リスクあり。

## 修正案

### A. `export ... from` の捕捉を追加

**`typescript-source-module-analyzer-adapter.ts` の `extractImports`** に ExportDeclaration ブランチを追加:

```typescript
if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
  const specifier = node.moduleSpecifier.text;
  if (!specifier.startsWith('.')) return;

  const fromDir = path.dirname(path.resolve(this.rootDir, fromFile.toString()));
  const resolved = path.resolve(fromDir, specifier.replace(/\.js$/, '.ts'));
  const relative = path.relative(this.rootDir, resolved);
  if (relative.startsWith('..')) return;

  // isTypeOnly: `export type { X } from '...'` または export specifiers 全て type
  const importKind = node.isTypeOnly === true ? 'type' as const : 'value' as const;

  try {
    edges.push(
      ImportEdge.create({
        from: fromFile,
        to: FilePathVO.fromWorkspaceRelative(relative),
        importKind,
      }),
    );
  } catch {
    // invalid path — skip
  }
}
```

### B. Dynamic import を再帰走査で捕捉

`ts.forEachChild` による浅い走査を `ts.visitEachChild` または手動再帰に置換し、関数ボディ内の `import()` も拾う。

```typescript
const visit = (node: ts.Node): void => {
  // ... 既存の ImportDeclaration / ExportDeclaration / 直下 CallExpression の処理
  ts.forEachChild(node, visit);
};
visit(sourceFile);
```

### Acceptance criteria

- [ ] `scripts/harness/quick-mode/domain/ports/changed-files-port.ts` が L1-006 ghost 判定から除外される（application port からの re-export で incoming edge が生成される）
- [ ] 関数内 `await import('...')` が edge として生成されることを unit test で確認
- [ ] 既存 3297 件のテストが全て green を維持
- [ ] `export type { X } from '...'` / `export * from '...'` / `export { X as Y } from '...'` 各バリエーションの unit test 追加

### 実装フェーズ

| Phase | 内容 | 見積り |
|---|---|---|
| A | ExportDeclaration branch 追加 + unit test | 1h |
| B | 再帰走査への置換 + nested dynamic import test | 1h |
| C | 既存テスト確認 + lint dogfood で false positive 消化確認 | 0.5h |

**合計見積り**: ~2.5h（quick-implementor scope: `bugfix`）

## ISSUE-003 Wave 3 残余との関係

本 issue 解決時に以下が自動解消:

- `quick-mode/domain/ports/changed-files-port.ts` の L1-006 false positive（re-export 経由で incoming 検出）

残余 `adr-foundation/infrastructure/seeds/initial-adr-definitions.ts` は re-export でなく真の未配線 seed のため本 issue では解消しない（composition-root 配線 or 削除の別判断が必要）。

## 参照

- `scripts/harness/biome-ast-engine/infrastructure/adapters/typescript-source-module-analyzer-adapter.ts:85-152`（extractImports 本体）
- `scripts/harness/biome-ast-engine/domain/value-objects/import-edge.ts`（ImportKind 定義）
- 関連 issue: ISSUE-003 Wave 3, ISSUE-016
