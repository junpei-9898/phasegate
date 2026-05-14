---
id: WI-191
type: issue
severity: high
status: drafted
affects: [phase-dependency-model, config-foundation, installation, quick-mode]
source: github#16
external_ref: https://github.com/junpei-9898/phasegate/issues/16
---

# WI-191: Strict preset retrofit projects can enter an inescapable planning loop

> 起票日: 2026-05-14
> 起票経緯: GitHub Issue #16。既存 ad-hoc 設計文書を持つ retrofit project に strict preset を適用すると、manual escape hatch を agent 経路から適用できない。

## 問題

`validate-metadata` では plan 文書が PASS しても、`check-phase-gate` は harness execution record ベースの planning evidence を要求し続ける。さらに `phasegate.config.json` の `planningMode.perPhase` を manual に緩和する変更は pre-tool-use hook で block されるため、agent が正規経路で閉ループを抜けられない。

## 再現概要

```text
$ npx phasegate validate-metadata docs/inception/_shared/product_overview_plan.md
[PASS]

$ npx phasegate check-phase-gate --level 2
- QAセクションが不足しています: 1:product-architect
- Planning Mode要件を満たしていません: 1:product-architect
- plan文書が不足しています: 1:story-writer
```

## 影響

- retrofit project で strict preset 導入後、AI / agent が config を緩和できない。
- `baseline --apply` でも phase-gate layer の requirement が変わらず、解決策に見える操作が効かない。
- error message が実際の不足物を説明せず、循環する next action を提示する。

## 受け入れ基準

- [ ] `config:plan` に retrofit / planning-mode relaxation 用 intent があり、agent が reviewable patch plan を取得できる。
- [ ] strict retrofit 導入時の正規 bootstrap 経路が文書化または CLI 化されている。
- [ ] `check-phase-gate` の message が missing QA と missing harness evidence を区別する。
- [ ] hook 防御を弱めずに、承認可能な escape hatch が存在する。
