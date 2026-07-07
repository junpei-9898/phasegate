---
id: WI-185
type: issue
severity: high
status: tested
affects: [phase2-extensions]
source: github#10
external_ref: https://github.com/junpei-9898/phasegate/issues/10
---

# WI-185: P2 freshness and pointer validators scan zero docs in downstream projects

> 起票日: 2026-05-14
> 起票経緯: GitHub Issue #10 の再現確認。current repo では docs を scan するが、package bin を一時 downstream project から実行すると 0 件になる。

## 再現結果

48 個の markdown を持つ一時 project で以下を確認した。

```text
$ phasegate p2:check-freshness --format json
{"results":[],"summary":{"total":0,"ok":0,"warn":0,"error":0},"errors":[]}

$ phasegate p2:check-freshness --pattern docs/sub/doc1.md --format json
{"results":[],"summary":{"total":0,"ok":0,"warn":0,"error":0},"errors":[]}

$ phasegate p2:validate-pointers --format json
{"results":[],"summary":{"totalDocuments":0,"totalPointers":0,"brokenPointers":0,"skippedUrlPointers":0},"passed":true,"errors":[]}
```

## 問題

- downstream cwd の docs tree が走査されず、L4 weekly consistency/pointer validation が false green になる。
- explicit single-file pattern でも 0 件になる。
- current repo と packaged downstream で resolver behavior が違う。

## 受け入れ基準

- [ ] downstream cwd の `docs/**/*.md` を default pattern で走査できる。
- [ ] explicit glob と single-file path の両方で対象 document が 1 件以上検出される。
- [ ] `p2:check-initial-creation` と freshness/pointer validators の path resolver が同等の project-root semantics を持つ。
