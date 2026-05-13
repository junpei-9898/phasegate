---
id: WI-154
type: issue
severity: high
status: tested
affects: [documentation, skills, setup, nyquist-validation, regression-suite, skill-quality]
source: internal
---

# WI-154: DEVELOPMENT And Skills README Modernization

> 起票日: 2026-05-12
> 起票経緯: 開発者向け docs の古い skill 数、init オプション、installation lifecycle、Nyquist / skill-quality wiring を現行仕様へ更新するため。

## スコープ

- `DEVELOPMENT.md`
- `skills/README.md`

## 主要変更

- `28 skills` などの古い数値を現行に合わせる。
- `init --skills core|aidlc|all` の扱いを現行仕様に合わせる。
- installation unit / command dispatch の開発者向け説明を追加する。
- operations skills と Claude/Codex skill link の扱いを整理する。
- Nyquist / regression-suite / skill-quality CLI wiring を現行に合わせる。
- `.claude/skills` / `.codex/skills` の symlink / directory / manifest / deploy target の実態を整理する。

## 受け入れ基準

- [x] README / guide / DEVELOPMENT / skills README の間で skill 数・skill 名・setup 方針が矛盾しない。
- [x] 開発者が新しい skill を追加するときの docs 更新先が分かる。

## 反映

- `DEVELOPMENT.md`
- `skills/README.md`

## 依存

`WI-150`, `WI-153` の結果に合わせる。
