---
id: WI-123
type: issue
severity: normal
status: drafted
affects: [agent-integration, ci-governance, harness-api]
source: internal
---

# WI-123: hook skip and baseline bypass states must be visible in status reports

> 起票日: 2026-05-09
> 起票経緯: agent hook / baseline review で、hook timeout / disabled / reentry / apply_patch bypass / baseline grandfather は安全上必要だが、継続すると PhaseGate が効いていない範囲を見落とす可能性があることを確認した。

## 背景

agent hooks と baseline grandfather は既存 repository への導入や reentry 防止に必要である。一方、skip や bypass が成功扱いで流れ続けると、利用者は「検証が通った」のか「検証が実行されなかった」のかを見分けにくい。

これは hook 機能追加ではなく、既存 hook / baseline 運用の透明性を上げる改善である。

## 本 WI でやること

1. hook skip reason（HOOK_DISABLED / TIMEOUT_EXCEEDED / REENTRY_DETECTED など）を集計できる形で記録する。
2. Codex apply_patch bypass と pre-commit fallback の関係を status / docs で明示する。
3. baseline grandfather 対象 file count、sha mismatch、解除率を report する。
4. `phasegate:status --json` に hook / baseline health を追加する。
5. skip が多い場合の next action を出す。

## 受け入れ基準

- [ ] hook が skip された場合、理由と対象 path が観測可能な形で残る。
- [ ] `phasegate:status --json` が hook enabled state / latest skip state / baseline debt を分離して返す。
- [ ] baseline grandfather が品質 gate failure と混同されない。
- [ ] apply_patch bypass の制約と pre-commit backstop が public docs に明記される。
- [ ] skip / bypass が一定以上の場合、warning と next action が出る。

## 関連

- WI-112: `phasegate:status` must report trustworthy, non-stale state
- WI-109: PhaseGate self-lint architecture violation must be resolved
