# WI-292 Integration Test Design: Matrix regeneration / L3

<!-- @work-item-id WI-292 -->

## Cases

| ID | Scenario | Expected |
|---|---|---|
| IT-WI292-001 | H17-07〜12 planned、refなし | matrixに表示、L3-004 non-blocking |
| IT-WI292-002 | planned Storyへtest annotation追加 | L3-004 FAIL |
| IT-WI292-003 | plannedをplanned -> requiredへ進めtest追加 | L3-004 PASS |
| IT-WI292-004 | required -> planned declaration | schema / policy FAIL |
| IT-WI292-005 | legacy status省略Story |従来のrequired coverage |
| IT-WI292-006 | self-repo matrix再生成とreadiness検査 | L3全PASS、check-ready 88/88維持 |

generated matrixは`.harness/`に置き、Git commit対象にしない。
