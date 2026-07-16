# WI-296 Unit Test Design: Pin / derive handlers

<!-- @work-item-id WI-296 -->

| ID | Case | Expected |
|---|---|---|
| UT-WI296-PIN-001 | exact endpoint preview | digest diff、repository write 0 |
| UT-WI296-PIN-002 | exact endpoint apply | constraintsだけatomic replace |
| UT-WI296-PIN-003 | missing / duplicate endpoint | domain failure、write 0 |
| UT-WI296-PIN-004 | malformed / ambiguous alias | domain failure、winnerなし |
| UT-WI296-PIN-005 | unknown schema / write failure | execution failure |
| UT-WI296-DER-001 | empty constraints | implicit evaluation + report |
| UT-WI296-DER-002 | blocking / cleanup report | finding verdict |
| UT-WI296-DER-003 | adopted / waived / debt only | success verdict |
| UT-WI296-CLI-001 | format flags | human / JSON alias、conflict exit 2 |
| UT-WI296-CLI-002 | derive out without write | exit 2、writer 0 |
| UT-WI296-CLI-003 | JSON domain finding | exit 1、stdoutにcomplete data |
| UT-WI296-CLI-004 | execution failure | exit 2、human stderr / JSON envelope |
