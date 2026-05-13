---
id: WI-167
type: issue
severity: normal
status: tested
affects: [documentation, validator-system, traceability-model]
source: internal
---

# WI-167: Product Unit Boundary And Catalog Cleanup

> 起票日: 2026-05-12
> 起票経緯: product construction と product unit catalog の所有境界を整理するため。

## スコープ

- `docs/product/construction/docs/*`
- `docs/product/construction/documentation/*`
- `docs/product/units/*`
- `docs/product/environment_contract.md`
- hyphen / underscore の unit file 二重定義
- `{unit}_unit.md` placeholder
- 旧 Unit 数・旧 validator registry 参照

## 受け入れ基準

- [x] `docs` Unit が現役、legacy、alias のどれか明確になる。
- [x] metadata / story reflection が二重 Unit を誤解しない。
- [x] WI-127..139 の product reflection 所有者が説明可能。
- [x] `docs/product/units/*` が product construction の実 Unit 境界と矛盾しない。

## 依存

なし。product docs cleanup として独立可能。

## 対応結果

- `documentation` を active Unit、`docs` を legacy alias として product construction docs に明記した。
- `docs/product/units/catalog_policy.md` と `{unit}_unit.md` に kebab-case canonical / underscore alias / placeholder shim の扱いを追加した。
- environment / integration contract で Unit catalog の正本と alias 境界を同期した。
