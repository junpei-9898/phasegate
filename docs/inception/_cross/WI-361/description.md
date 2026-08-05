---
id: WI-361
type: chore
severity: medium
status: drafted
affects: [ci-governance]
source: CI の integrity:verify ステップが赤（WI-355 で SKILL.md を更新した際の re-pin 漏れ）
---

# WI-361: WI-355 で更新した quick-implementor/SKILL.md の integrity manifest を再 pin する

<!-- @work-item-id WI-361 -->

## 背景

WI-355（コミット `10ee708a` / v0.309.0）で `skills/quick-implementor/SKILL.md` に
カテゴリ判定がパスベースであること・config allowlist の実体・ブロック時の復旧手順を追記した際、
ADR-030 §Decision.3.① の integrity manifest（`phasegate.integrity.json`）の再 pin が漏れていた。

`skills/*/SKILL.md` は指示搭載ファイル（trust root の pin 対象）であるため、
manifest に記録された digest と実ファイルの SHA-256 が不一致となり、
CI の `integrity:verify` ステップが drift 1 件（MISMATCH）で exit 2 になっていた。

```
integrity drift を 1 件検出しました（phasegate.integrity.json）:
- [MISMATCH (digest 不一致)] skills/quick-implementor/SKILL.md
```

## 修正

`phasegate integrity:pin` を実行し、manifest を再計算・書き出す。
差分は当該 1 エントリの digest 更新のみで、`added` / `missing` は発生しない
（pin 前後ともエントリ数 39）。実行後 `integrity:verify` は exit 0。

## 防御が緩まないことの根拠

WI-355 の SKILL.md 変更は正規のコミットとしてレビュー済みの意図的な変更であり、
ADR-030 が pin 更新の正規手段として定める `integrity:pin` をそのまま用いている
（manifest の手編集や verify のスキップは行っていない）。
信頼のルートは CI 上での再計算照合であり、本コミット後も CI が
実ファイルから digest を再計算して manifest と突き合わせる構造は不変。
