---
id: WI-142
type: issue
severity: normal
status: tested
affects: []
source: dogfood
---

# WI-142: ci:generate-template should default to standard preset

> 起票日: 2026-05-10
> 起票経緯: phasegate@0.144.0 post-publish dogfood で、`ci:generate-template --type agent-context-refresh --render` が `Preset not found: default` で失敗することを確認した。`--preset standard` を明示すると成功するため、CLI default と実在 preset の不整合が原因。

## 背景

`ci:generate-template` は help / README で `--preset` を発見可能にしている一方、README には `--preset` なしの render 例が存在する。現状実装は `--preset` 未指定時に `"default"` を渡すが、`PresetConfigAdapter` が持つ preset は `standard | strict | minimal` のみである。

利用者が標準テンプレートを表示したいだけのときに `Preset not found: default` で失敗するのは、公開 CLI の UX として不自然である。

## 本 WI でやること

1. `ci:generate-template` の `--preset` 未指定時 default を `standard` にする。
2. help / docs で `--preset` が省略可能で、既定が `standard` であることを明記する。
3. `ci:generate-template --type agent-context-refresh --render` が `--preset` なしで成功する回帰テストを追加する。
4. 修正後に公開パッケージ相当の dogfood 手順で再確認する。

## 受け入れ基準

- [ ] `phasegate ci:generate-template --type agent-context-refresh --render` が `--preset` なしで成功する。
- [ ] `--preset standard` を明示した既存挙動と矛盾しない。
- [ ] help / docs が default preset を `standard` と説明する。
- [ ] dogfood で `Preset not found: default` が再発しない。

