---
id: WI-126
type: story
severity: normal
status: tested
affects: [traceability-model, phase-dependency-model, validator-system, harness-api]
source: internal
---

# WI-126: Work item status must be derived and updated by PhaseGate

> 起票日: 2026-05-09
> 起票経緯: README review で、WI frontmatter の `status: drafted | reflected | implemented | tested` は PhaseGate が自動更新すると記載されている一方、現状は parse / validate が中心で状態遷移の自動更新が不足していることを確認した。

## 背景

README と folder management rules は、WI status を AIDLC state machine として扱う。期待される状態は、inception artifacts、product docs の `@work-item-id` reflection、src 実装、test annotation、validator 結果から導出できる。

現状は WI frontmatter の形式検証と migration は存在するが、状態を安全に判定して description.md へ書き戻す運用導線が弱い。そのため、実態と `status` がずれやすく、agent / reviewer が WI の完了状態を信頼しにくい。

## 本 WI でやること

1. WI type ごとの状態遷移条件を機械判定できる contract として定義する。
2. `drafted` / `reflected` / `implemented` / `tested` の derived status を計算する use case を追加する。
3. dry-run report と apply mode を分け、frontmatter 書き戻しを安全に実行できるようにする。
4. 手動 status と derived status が食い違う場合の warning / fail policy を定義する。
5. `phasegate:status` または専用 command から stale WI status を確認できるようにする。

## 受け入れ基準

- [ ] WI type ごとの状態遷移条件が docs と product design に反映されている。
- [ ] dry-run で current status / derived status / reason / next action を確認できる。
- [ ] apply mode が description.md の該当 frontmatter のみを更新する。
- [ ] `chore` / `fix` の shortcut path が README の説明と一致する。
- [ ] status 不一致が L2 または status report で検出可能である。

## 関連

- `docs/folder_management_rules.md`
- `docs/product/user_stories.md`
- `scripts/harness/traceability-model/`
- WI-074: WorkItem frontmatter parser
