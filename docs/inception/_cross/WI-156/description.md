---
id: WI-156
type: story
severity: high
status: tested
affects: [documentation, validator-system, config-foundation, skill-quality]
source: internal
---

# WI-156: Documentation Drift Guardrails

> 起票日: 2026-05-12
> 起票経緯: 今回見つかった docs drift を、今後のリリース前に検出できる仕組みにするため。

## 検出候補

- README / CLI reference に載る npm scripts と `package.json` の差分。
- CLI reference の command 名と実 CLI help / command registry の差分。
- install target 名と guide の workflow file 名の差分。
- install / reconcile target registry と doctor checks と setup docs の差分。
- skills README の skill 数と `skills/*/SKILL.md` 実数の差分。
- `docs/guide/configuration.md` の主要 config key と schema/preset の差分。
- `phasegate.config.json` sample / schema / preset JSON / README / guide の key 差分。
- `protectedFiles.patterns` のような実装が読むが schema が許可しない config key。
- `package.json` / `biome.json` / `tsconfig.json` の toolchain guardrail と docs の差分。
- legacy-only docs reference の検出。

## 主要成果物

- 新規 validator または既存 L2/L4 validator 拡張。
- `docs/guide/layer-model.md` または `docs/guide/cli-reference.md` への検証説明。
- `DEVELOPMENT.md` への release-before checklist。

## 受け入れ基準

- [x] 少なくとも command/script drift, install target drift, skill count drift のいずれかを自動検出できる。
- [x] 手動チェックに残すものと自動チェックにするものが明確に分かれる。
- [x] 失敗時の remediation が docs に書かれている。

## 実装方針

まず `skill count drift` を `L4-006 skill-catalog-drift` として自動検出する。`skills/*/SKILL.md` の実数と、`skills/README.md` / `README.md` / `DEVELOPMENT.md` / public guide の宣言数、および `docs/guide/skills-overview.md` のカテゴリ合計を比較する。

`command/script drift` と `install target drift` は本 WI では release checklist 上の手動確認に残し、別 WI で自動化する。

## 依存

`WI-149..154` の手修正後に着手する。
