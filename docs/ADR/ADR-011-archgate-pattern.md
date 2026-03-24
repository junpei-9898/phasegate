# ADR-011: archgate パターン — L1 ルールによるアーキテクチャ強制

## Status

Accepted

## Context

「ドメイン層は外部フレームワークに依存しない」「全ソースファイルに Unit/Layer 帰属を明示する」といったアーキテクチャルールは、ドキュメントに書いただけでは破られる。特に AI エージェントは利便性を優先してルールを無視する傾向がある。

## Decision

アーキテクチャルールを **実行可能なコード（Biome AST ルール）** として表現する。このパターンを **archgate** と呼ぶ。

### archgate の実装例

```typescript
// L1-003: no-layer-violation
// domain/ 配下のファイルが infrastructure/ や presentation/ から import していないか検証
//
// 例: 以下のコードは L1-003 違反として検出される
// scripts/harness/validator-system/domain/services/drift-detection-service.ts
import { FileSystemAdapter } from '../../infrastructure/adapters/fs-adapter.js';
//       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//       L1-003: domain 層から infrastructure 層への import は禁止です
//
// 正しいパターン: Port（インターフェース）を経由する
import type { FileSystemPort } from '../ports/file-system-port.js';
```

```typescript
// L1-001: require-unit-comment
// 全ソースファイルに @unit コメントが必要
//
// 違反例:
export class MyService { }  // L1-001: @unit コメントがありません
//
// 正しいパターン:
/**
 * @unit validator-system
 * @layer domain
 */
export class MyService { }
```

### Executable Governance 原則

| ルール | ドキュメント表現 | archgate 表現 |
|--------|----------------|--------------|
| レイヤー境界 | 「domain は infrastructure に依存しない」 | `no-layer-violation` が import グラフを解析 |
| メタデータ | 「全ファイルに @unit を書く」 | `require-unit-comment` が AST で検出 |
| フォルダ構造 | 「規約に従う」 | `enforce-folder-structure` がパス検証 |

## Consequences

- プロンプトで「願う」のではなくコードで「強制する」
- 違反はコミット前に検出され、レビューコストが削減される
- AI エージェントのプロンプト遵守度に品質が依存しない

## 関連要件

K1（4層防御）、K3（Biome AST解析）
