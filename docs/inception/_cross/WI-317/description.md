---
id: WI-317
type: fix
severity: high
status: implemented
affects: [validator-system]
source: github#37
---

# WI-317: カバレッジゲート opt-out（coverageThreshold: 0）が到達不能で L3-003 が fail-closed に陥る

<!-- @work-item-id WI-317 -->

## 背景

`run-l3-validators-usecase.ts` の L3-003 ブロックはコメントで「coverageThreshold 未設定 → SKIP（カバレッジゲートはオプトイン）」と謳い `threshold === null` で SKIP していたが、この分岐は実運用 config から到達不能だった:

- 全防御プリセット（standard=90 / strict=95 / minimal=0）が coverageThreshold を定義しており、config でキーを省略しても deepMerge がプリセット値を残す
- config スキーマ（v2 / v3）は coverageThreshold を number のみで定義し null を拒否する
- `coverageThreshold: 0` も救済にならなかった: threshold=0 でも `getCoverage()` が呼ばれ、カバレッジレポート不在だと catch で fail-closed FAIL になる

一方、ドメイン VO `L3Config` は `hasCoverageGate(): boolean { return this.coverageThreshold > 0; }` を持ち、**0 = カバレッジゲート無効**がドメインの意図（minimal プリセットの 0 も同じ意図）。run-l3 usecase が 0 を「有効な閾値」として扱っていたのがバグで、結果としてカバレッジゲートを opt-out する手段が実質存在しなかった。

## 修正

- L3-003 の SKIP 条件を `threshold === null || threshold === 0` に変更（0 を正規の opt-out として扱い、`getCoverage()` を呼ばない）
- SKIP reason を「coverageThreshold が未設定/0 のためカバレッジ判定をスキップ（カバレッジゲートはオプトイン。0 で opt-out）」に更新
- ブロック冒頭コメントを実挙動（0 opt-out、ドメイン VO `hasCoverageGate()` との整合）に合わせて更新
- レポート不在 FAIL の suggestion を 3 択案内に改善: (a) カバレッジ付きテスト実行（例: vitest --coverage）、(b) opt-out するなら `layers.L3.coverageThreshold: 0`、(c) 非 JS/TS プロジェクトなら `project.languages` を宣言（例: `["python"]`）して L3-003 を unsupported-language SKIP にする
- スキーマ・ドメイン VO・プリセット JSON は変更なし（0 が正規の opt-out。型拡張はスコープ外）
- 回帰テスト追加: threshold=0 SKIP（getCoverage 不呼出）／threshold=null SKIP／レポート不在 FAIL の suggestion 文言／カバレッジ充足 PASS
