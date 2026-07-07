---
id: WI-119
type: issue
severity: normal
status: tested
affects: [validator-system, biome-ast-engine]
source: internal
---

# WI-119: L4 dead-code detector must use real import/export graph analysis

> 起票日: 2026-05-09
> 起票経緯: validator-system review で、L4-003 dead-code detector は登録済みだが、実入力 adapter が `unusedExports: []` / `unreachableCode: []` を返しており、実務上の dead-code signal として機能していないことを確認した。

## 背景

L4-003 は「未使用コード検出」として存在するが、現状は import/export graph を組み立てる入口が浅く、unused export / unreachable code を実際に判定できていない。

これは新規 validator の追加ではなく、既存 L4-003 を実務で信頼できる scheduled advisory signal にするための品質改善である。

## 本 WI でやること

1. TypeScript AST ベースで export / import / re-export / dynamic import を正規化した graph を構築する。
2. entrypoint / public API / CLI handler / test-only helper など、dead-code 判定から除外すべき境界を定義する。
3. unused export と unreachable file / code range の判定ロジックを実装する。
4. barrel file と `export * from` による false positive を防ぐ。
5. report に削除候補、参照元なし理由、除外理由を含める。

## 受け入れ基準

- [x] 未参照 export を fixture で検出できる。
- [x] barrel re-export 経由で参照される export を未使用扱いしない。
- [x] CLI entrypoint / package public API / test fixture の除外方針が docs / tests に残っている。
- [x] `validate --layer L4 --fail-on-warning` のときだけ gate failure にできる。
- [x] L4-003 の output が削除候補としてレビュー可能な粒度になっている。

## 関連

- WI-107: CI/L4 execution semantics must be unified
- WI-117: L4 drift detection precision must be improved before gating use
