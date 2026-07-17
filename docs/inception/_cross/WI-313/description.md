---
id: WI-313
type: fix
severity: critical
status: drafted
affects: [packaging]
source: github#34
---

# WI-313: typescript peer range が TypeScript 7 を許容し全コマンドがクラッシュする

<!-- @work-item-id WI-313 -->

## 背景

`package.json` の `peerDependencies` が `"typescript": ">=5.0.0"` を宣言しており、npm の peer 自動インストールで typescript@7.x が解決される。TypeScript 7 は `exports` の `"."` が version 文字列のみを返し classic compiler API（`ts.ScriptTarget` 等）が `./unstable/*` へ移動したため、`import * as ts from 'typescript'` に依存する phasegate の全コマンドが `Cannot read properties of undefined (reading 'ESNext')` でクラッシュする。新規グローバルインストール直後に必ず踏む。

## 修正

- peer range を `">=5.0.0 <7.0.0"` に制限し、TypeScript 7 系をインストール時に弾く
- packaging contract テストに peer range の回帰テストを追加

TypeScript 7 対応（`typescript/unstable/*` への移行）は本 WI のスコープ外。
