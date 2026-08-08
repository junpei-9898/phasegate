---
id: WI-386
type: fix
status: implemented
severity: high
affects: [agent-integration, quick-mode]
source: validation bypass payloads
---

# WI-386: protected file path normalization bypass を修正する

<!-- @work-item-id WI-386 -->

## 問題

PreToolUse hook が抽出した書き込み先を project root 相対へ正規化せず、
`ProtectedFileList` と quick-mode classifier に渡している。`./biome.json`、
`docs/../biome.json`、project 内の絶対パスが `biome.json` と同一ファイルでも
保護照合を回避でき、`docs/../biome.json` は誤って `docs` category に分類される。

## 修正

- config から project root を確定した直後に、抽出済み target path と target change path を
  `resolve(cwd, path) -> relative(projectRoot, resolved)` で一度だけ canonical 化する。
- canonical path を protected-file、phase gate、quick-mode の全判定へ共通入力として渡す。
- snake_case / camelCase / nested の 3 payload shape で `./`、`../`、絶対パスを拒否し、
  正常な docs path の許可契約が不変であることを回帰テストする。

