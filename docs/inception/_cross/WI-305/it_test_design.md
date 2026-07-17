# WI-305 Integration Test Design

<!-- @work-item-id WI-305 -->

| ID | Scenario | Expected |
|---|---|---|
| IT-WI305-GIT-001 | explicit fragment本文のstaged hunk | path / role / key / WI / reflectsを観測 |
| IT-WI305-GIT-002 | 同一fileの別fragmentだけ変更 | 変更fragmentだけを観測 |
| IT-WI305-GIT-003 | fragment追加 / 削除 | current / baselineからchanged candidate化 |
| IT-WI305-HOOK-001 | pin済み変更 + matching trailer | exit 0、declaration PASS |
| IT-WI305-HOOK-002 | pin済み変更 + missing / mismatch trailer | exit 1、fixed finding code |
| IT-WI305-HOOK-003 | World disabled | 従来結果、World provider未実行 |
| IT-WI305-HOOK-004 | invalid constraint control | warning、declaration checkはfail-open |

self-repo simulationではWI-305のproduct fragmentを変更候補、対応pinをsynthetic inputとして同じpolicyへ渡し、matching `Work-Item: WI-305`はpass、欠落はblockする。実際のGit indexは変更しない。
