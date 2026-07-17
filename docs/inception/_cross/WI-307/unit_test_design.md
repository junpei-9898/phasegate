# WI-307 Unit Test Design

<!-- @work-item-id WI-307 -->

WM-24は既存domain / application semanticsを変更しないため、新しいdomain unit testは追加しない。pure contractとして扱えるtemplate content assertionsを次のtargeted testへ追加する。

| ID | Case | Expected |
|---|---|---|
| UT-WI307-TPL-001 | bundled aidlc-gateをrender | matrix生成がL3より前にある |
| UT-WI307-TPL-002 | World config selection | exact `world.enabled === true`だけをenabledとして出力する |
| UT-WI307-TPL-003 | enabled World stage | derive二回、byte compare、L3の順に並ぶ |
| UT-WI307-TPL-004 | disabled / absent World config | World stepはconditionでskip可能、既存L3は常時実行 |
| UT-WI307-CI-001 | warning-only raw result、`failOnWarning:false` | public `passed:true`、`allPassed:true`、warning保持 |
| UT-WI307-CI-002 | warning-only raw result、`failOnWarning:true` | public `passed:false`、`allPassed:false`、warning保持 |
| UT-WI307-CI-003 | warning以外またはdiagnosticなしのraw failure | fail-closedの`passed:false`を維持 |

テスト名は日本語、Arrange / Act / Assertを明示する。YAML contentの完全一致正本testを維持しつつ、重要な順序はmarker indexの大小でも固定する。
