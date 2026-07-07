---
id: WI-219
type: issue
severity: normal
status: drafted
affects: [config-foundation, installation]
source: github#32
external_ref: https://github.com/junpei-9898/phasegate/issues/32
---

# WI-219: Model delegation should be configurable and disable delegate-sonnet when requested

> 起票日: 2026-06-12
> 起票経緯: GitHub Issue #32。各 skill の Sonnet 委任と `model: sonnet` / `review: opus` が固定されており、ユーザーや実行環境が委任なし運用を選べない。

## 問題

PhaseGate の複数 skill は frontmatter に `model: sonnet` / `review: opus` を持ち、本文の 3 フェーズ実行ルールで Phase 2 を `npx phasegate delegate-sonnet` に委任するよう記述している。これは、メインセッションのモデルが十分高性能な場合や、別プロセス起動・コンテキスト分断・レビュー往復のコストを避けたい場合でも固定で残る。

さらに `skills/` と agent runtime 配備先 (`.claude/skills/` など) は manifest / reconcile / update-skills の管理対象であるため、利用者が手作業で skill 文面を直しても配備更新で戻る。利用側の `AGENTS.md` / `CLAUDE.md` で「delegate-sonnet を使わない」と上書きすると、ツール配備文書と運用指示が恒久的に矛盾する。

## 再現確認

2026-06-12 に current main で確認した。

- `phasegate.config.json` / config schema / docs templates に `modelRouting` または delegation control がない。
- `skills/*/SKILL.md` には `model: sonnet`, `review: opus`, `npx phasegate delegate-sonnet` の記述が残っている。
- `.claude/skills/*/SKILL.md` などの配備済み skill にも同趣旨の Sonnet 委任記述が残る。
- `phasegate delegate-sonnet` は config を参照せず、unconditional pass-through command として存在する。

## 期待されるふるまい

利用者が config で model delegation policy を宣言でき、少なくとも委任なし運用を選べる。

例:

```json
{
  "modelRouting": {
    "delegation": "none"
  }
}
```

`delegation: "none"` のときは、skill 配備時に Phase 2 の委任規定を「メインセッションが直接実行する」方針へ差し替えるか、委任記述を除去する。3フェーズ構造、human approval、review / BLOCK-WARN 基準は維持する。

## 受け入れ基準

- [ ] `phasegate.config.json` schema / domain config / templates が model delegation policy を表現できる。
- [ ] `delegation: "none"` を指定した `init` / `reconcile` / skill deploy が、配備先 skill の `model: sonnet` / `review: opus` / `delegate-sonnet` 固定記述を残さない。
- [ ] delegation enabled の既定挙動は後方互換として維持される。
- [ ] `phasegate delegate-sonnet` は delegation disabled config を検出した場合、structured error で拒否するか、明示的な dry-run / help 以外を実行しない。
- [ ] `docs/principles/model-routing.md` と利用者向け guide に、委任可否は config と実行環境指示を優先することを `@work-item-id WI-219` 付きで反映する。
- [ ] skill-quality validation が、delegation policy に応じた skill frontmatter / body の整合を検証する。

## 非スコープ

- Sonnet 以外の具体的なモデル名やバージョンを hardcode すること。
- サブエージェントの実行基盤を新規実装すること。
- 既存 `delegate-sonnet` command の後方互換ヘルプ契約を破壊すること。

## 関連

- GitHub Issue #32: https://github.com/junpei-9898/phasegate/issues/32
- `docs/principles/model-routing.md`: モデル名ではなく役割と環境指示で委任判断する原則。
- WI-004 / WI-196 / WI-189: `delegate-sonnet` command と help / pass-through の既存整備。
