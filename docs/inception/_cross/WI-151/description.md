---
id: WI-151
type: issue
severity: normal
status: reflected
affects: [documentation]
source: internal
---

# WI-151: Layer Status Drift Semantics Guide

> 起票日: 2026-05-12
> 起票経緯: L2 / L4 / status / drift の運用意味を、利用者が CI やローカル運用で誤用しない粒度まで公開 guide に出すため。

## スコープ

- `phasegate:status --json`
- `phasegate:detect-drift --json`
- `configurationState`, `cachedArtifactState`, `liveValidationState`
- hook / baseline health
- effective layer enablement
- `L2-013 cli-e2e-test-existence`
- `missing` と `limitation` の違い
- L4 fail-on-warning の前提条件

## 主要成果物

- `README.md`
- `docs/guide/cli-reference.md`
- `docs/guide/layer-model.md`
- 必要なら `docs/guide/configuration.md`

## 受け入れ基準

- [x] JSON 出力の主要キーと、それを人間・CI・agent がどう使うかが説明されている。
- [x] L4 warning を失敗扱いにする条件が README からも分かる。
- [x] `L2-013` が layer guide の validator 表に載る。

## 依存

`WI-150` と並行可能。ただし CLI 名は `WI-150` に合わせる。
