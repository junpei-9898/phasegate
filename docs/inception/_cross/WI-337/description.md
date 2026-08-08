---
id: WI-337
type: fix
severity: high
status: implemented
affects: [traceability-model]
source: bug sweep v0.292.0 (2026-07-21) Bug#2
---

# WI-337: WorkItem severity enum の実態乖離による work-items:status / bypass:audit 全面クラッシュ修正

<!-- @work-item-id WI-337 -->

## 背景

`WORK_ITEM_SEVERITIES` が {trivial, normal, high} の 3 値のみである一方、コミット済み実データ(docs/inception/**/description.md)には medium×約10 / critical×2 / major×2 / 「normal。」(全角句点)×1 が存在。パーサーの severity 検証が throw し、**1 ファイルの不正で `work-items:status --dry-run` / `bypass:audit` が全面クラッシュ**(exit 2)。エラーに原因ファイル名が含まれず、`--json` 指定時も JSON が出ない。

## 修正

1. enum を実態に合わせ {trivial, normal, medium, high, critical, major} の 6 値へ拡張(値の受理のみ、マッピング変換なし)。
2. 複数 WI 走査経路はパース失敗を「当該 WI のみ warning スキップ(原因ファイルパス付き)」とし全体クラッシュを廃止。単一 WI 明示指定の読み込みは従来どおりエラー維持。
3. 既存データの不正値(「normal。」等)を正規化。
