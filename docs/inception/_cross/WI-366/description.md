---
id: WI-366
type: chore
severity: trivial
status: drafted
affects: [docs]
source: GitHub issue #46（WI-360 自身の description.md 欠落）
---

# WI-366: WI-360 の description.md を追加する

<!-- @work-item-id WI-366 -->

## 背景

WI-360 は WI-352〜358 の `description.md` をバックフィルするコミットだったが、
バックフィル対象リストに自分自身が入っておらず、
`docs/inception/_cross/WI-360/description.md` だけが欠落したままになっていた。

`docs/inception/_cross/` を WI 台帳として使う以上、
「バックフィルを行った WI 自身が台帳に載っていない」状態は
`_cross` 配下の一覧性・追跡性を損なう。

## 修正

- `docs/inception/_cross/WI-360/description.md` を、WI-360 のコミット `ede1ef5f`
  （メッセージ本文と 7 ファイル新規作成の diff）に基づいて作成する。
  内容は事後の再構成であることを本文中に明記し、新たな仕様判断は含めない。
- あわせて issue #46 対応で新設した WI-363 / WI-364 / WI-365 / WI-366 の
  `description.md` も各コミットに同梱する（直近の慣行に合わせる）。

## スコープ外

`docs/inception/_cross/` 配下の他 WI について網羅的な欠落調査は行っていない。
issue #46 が明示的に指摘した WI-360 のみを対象とする。
