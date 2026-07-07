---
id: WI-186
type: issue
severity: high
status: tested
affects: [harness-api]
source: github#11
external_ref: https://github.com/junpei-9898/phasegate/issues/11
---

# WI-186: Health check commands disagree about project status

> 起票日: 2026-05-14
> 起票経緯: GitHub Issue #11 の再現確認。報告と完全同一の verdict ではないが、同一 checkout で health surfaces の矛盾を確認した。

## 再現結果

```text
$ bin/phasegate validate --layer L4
総合判定: PASS

$ bin/phasegate phasegate:complete-check --json
{"status":"fail", ... no-layer-violation ...}

$ bin/phasegate phasegate:status --json
{"status":"pass", ... "layers":[{"layerId":"L1","liveValidationState":"fail"}, ...]}
```

## 問題

- top-level `phasegate:status` は pass だが、payload 内の L1 live state は fail。
- `validate --layer L4` は PASS だが、complete-check は fail。
- consumer がどの command を gate として信頼すべきか判断しにくい。

## 受け入れ基準

- [ ] health command ごとの coverage matrix と intended gate semantics が docs/CLI help に明記される。
- [ ] `phasegate:status` の top-level status と layer live states が矛盾しない。
- [ ] `complete-check` / `check-ready` / `validate` / `status` の期待差分を regression test で固定する。
