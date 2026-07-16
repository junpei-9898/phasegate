# WI-300 Unit Test Design

<!-- @work-item-id WI-300 -->

| ID | Case | Expected |
|---|---|---|
| UT-WI300-WCFG-001 | canonical resolved World document | 全fieldをimmutable plain copyで保持 |
| UT-WI300-WCFG-002 | absolute / backslash / traversal path | ConfigValidationError |
| UT-WI300-WCFG-003 | corpus role overlap / case-fold collision | winnerを選ばずConfigValidationError |
| UT-WI300-WCFG-004 | session limit境界 | 1/20、1/8000は受理、範囲外は拒否 |
| UT-WI300-PRESET-001 | source world partial override | nested merge、未指定fieldはpreset値 |
| UT-WI300-PRESET-002 | legacy path inheritance | World field省略時だけlegacy値を継承 |
| UT-WI300-MAP-001 | World mapper | 完全なplain resolved contractを返す |
| UT-WI300-MAP-002 | validator mapper | world projectionを渡すが予約validatorを追加しない |

テストは日本語名、semantic AAAで記述し、domain Value Objectは実体を使う。
