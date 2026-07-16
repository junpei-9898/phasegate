---
adr_id: "001"
title: "L1 — Biome AST による Editor-Time 品質強制"
status: Accepted
date: 2026-03-24
---

# L1 — Biome AST による Editor-Time 品質強制

## Context

AIエージェントが生成するコードのアーキテクチャ違反（レイヤー境界越え、メタデータ欠落、不適切なファイル配置）をプロンプトベースの指示だけで防ぐことは不可能である。プロンプト遵守率はエージェントやモデルに依存し、品質が確率的になる。

## Decision

Rust製 Biome の AST 解析を用いて、L1（Editor-Time）で以下の8ルールを機械的に強制する。

| ルール | コード | 検出対象 |
|--------|--------|---------|
| require-unit-comment | L1-001 | `@unit` コメント欠落 |
| require-layer-comment | L1-002 | `@layer` コメント欠落 |
| no-layer-violation | L1-003 | レイヤー境界を越える import |
| enforce-folder-structure | L1-004 | アーキテクチャ規約違反のファイル配置 |
| no-any-abuse | L1-005 | `any` 型の乱用 |
| no-ghost-file | L1-006 | import されないファイル |
| no-comment-flood | L1-007 | 過剰なコメント |
| no-code-duplication | L1-008 | 構造的に重複するコードブロック |

> 注記（WI-274, 2026-07-16）: 上表の L1-006〜L1-008 のルール名↔コード対応は当時の記述であり、現行の canonical と異なる。現行の正しい対応は `L1-006`=`no-code-duplication` / `L1-007`=`no-ghost-file` / `L1-008`=`no-comment-flood`（WI-265 で是正済み。真実の源は `biome-ast-engine` の `rule-definition-registry.ts`）。本文は歴史記録として保存する。

## Consequences

- エージェントのプロンプト遵守度に品質が依存しない
- Rust 製 Biome により 50-100 倍の高速 AST 解析が可能
- import グラフ解析によりレイヤー違反を物理的に検出

> 補記（2026-07-05）: 本 ADR が参照する「K1（4層防御モデル）」は v1 時点の層数である。その後 L0（FUSE は defer、hooks engine として実現）が加わり防御モデルは 5層（L0-L4）へ復帰した。経緯は ADR-025（FUSE Hooks Engine は v1 スコープ外）および ADR-029（L0 4層→5層復帰パス）を参照。本 ADR の決定（L1 の 8 ルールを Biome AST で強制）は現行で不変。

## 関連要件

K1（4層防御モデル — 現在は 5層 L0-L4、ADR-029 参照）、K3（Biome AST解析）、K3.5（@unit/@layerメタデータ）

## Alternatives

当時、代替案は明示的に文書化されていない。本節は既存決定を `validate-adr` ゲートで検査可能にするための遡及的正規化（コーパス正規化）に伴い追加された。
