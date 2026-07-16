# WI-296 Integration Test Design: World CLI

<!-- @work-item-id WI-296 -->

| ID | Scenario | Expected |
|---|---|---|
| IT-WI296-CLI-001 | root / subcommand help | pin / derive flag contract掲載 |
| IT-WI296-CLI-002 | pin preview | constraints / policy / report不変 |
| IT-WI296-CLI-003 | pin apply | constraintsだけ変更、再load可能 |
| IT-WI296-CLI-004 | missing / duplicate pin | exit 1、全file不変 |
| IT-WI296-CLI-005 | derive pure | report writeなし、exit 0/1 |
| IT-WI296-CLI-006 | derive write default / out | raw schema-valid reportだけ保存 |
| IT-WI296-CLI-007 | unknown schema / invalid config | exit 2、fallbackなし |
| IT-WI296-CLI-008 | derive JSON double-run | byte-identical、generatedAtなし |
| IT-WI296-CLI-009 | dispatch catalog | main casesとknown command集合一致 |

E2Eはprocess boundaryでstdout、stderr、exit status、filesystem diffを同時検証する。waiver 0件のfixtureではpolicy dateをcanonical `null`へ正規化し、wall clockによるoutput差を生じさせない。
