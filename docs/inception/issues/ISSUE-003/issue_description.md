# ISSUE-003: phasegate lint 残存 violation 145件の解消

## ステータス

- **起票日**: 2026-04-06
- **発見契機**: C-2（phasegate lint ベースライン対応）実施時
- **影響Unit**: 横断（biome-ast-engine, harness-api, ci-governance, regression-suite, skill-quality 等）
- **深刻度**: Low — 機能的影響なし。コード品質の改善事項
- **優先度**: 低 — ベースラインノイズは v0.31.0 で解消済み。残りは実 violation のみ

## 問題の概要

v0.31.0 で phasegate lint のベースラインノイズを 1,241 → 145 件に削減した（88%削減）。残り 145件はプロダクションコードの実 violation であり、いずれも機能的な問題は引き起こさないが、アーキテクチャ品質の観点で将来的に解消すべきである。

## 残存 violation の内訳

| ルール | コード | 件数 | 内容 |
|--------|--------|------|------|
| no-layer-violation | L1-003 | 55 | 禁止された依存方向の import（例: domain → infrastructure） |
| no-ghost-file | L1-007 | 43 | どこからも import されていない孤立ファイル |
| no-code-duplication | L1-006 | 31 | 複数ファイルに存在する重複コード |
| enforce-folder-structure | L1-004 | 12 | @layer 宣言とファイル配置ディレクトリの不一致 |
| no-any-abuse | L1-005 | 4 | any 型の過剰使用 |

## 対処方針（案）

### 優先度高（軽量で効果大）

1. **L1-004（12件）**: `@layer` 宣言の修正またはファイル移動。宣言と配置のズレを直すだけなので最も軽い
2. **L1-005（4件）**: any 型を具体的な型に置換。件数が少なく影響範囲も小さい

### 優先度中（調査が必要）

3. **L1-006（31件）**: 重複コードの共通化。どのコードが重複しているか調査し、共通モジュールへの抽出を検討
4. **L1-007（43件）**: 孤立ファイルの精査。本当に不要なら削除、エントリポイントなら設定で除外

### 優先度低（アーキテクチャ判断が必要）

5. **L1-003（55件）**: レイヤー違反の解消。依存方向の修正はリファクタ規模が大きく、設計判断を伴う

## 検証コマンド

```bash
# 現在の violation 一覧を確認
npx phasegate lint --json > /tmp/lint.json
node -e "const r=JSON.parse(require('fs').readFileSync('/tmp/lint.json','utf8')); const g={}; r.errors.forEach(e=>{g[e.code]=(g[e.code]||0)+1}); console.log('Total:', r.errors.length); console.log(g)"

# 特定ルールの違反ファイルを確認
node -e "const r=JSON.parse(require('fs').readFileSync('/tmp/lint.json','utf8')); r.errors.filter(e=>e.code==='L1-004').forEach(e=>console.log(e.message))"
```

## 関連

- v0.31.0 コミット `681fc81` — C-2 ベースライン対応
- `docs/inception/_shared/configurable_phase_gate_plan.md` §C-2
