---
id: WI-158
type: issue
severity: normal
status: reflected
affects: [documentation, harness-api, regression-suite, config-foundation]
source: internal
---

# WI-158: Reporting Output Path Contract Normalization

> 起票日: 2026-05-12
> 起票経緯: `reporting.outputDir`, `reports`, `.harness/reports`, `reports/regression` の関係を contract として整理するため。

## スコープ

- `reporting.outputDir`
- `reports`
- `.harness/reports`
- `reports/regression`
- doctor / status / regression-suite の report 出力

## 受け入れ基準

- [ ] 各 report 出力がどの config に従うか、固定パスなのか、legacy fallback なのかが分かる。
- [ ] doctor / status / regression-suite の説明と矛盾しない。
- [ ] docs だけで足りない場合は、実装 fallback や tests の見直し範囲が分かる。

## 依存

docs 説明だけなら `WI-152` に吸収可能。実装 fallback や tests の見直しが必要なら本 WI で扱う。
