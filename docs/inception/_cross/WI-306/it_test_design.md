# WI-306 Integration Test Design

<!-- @work-item-id WI-306 -->

| ID | Scenario | Expected |
|---|---|---|
| IT-WI306-V1-001 | provider未配線produce→verify | v1、exit 0、従来shape |
| IT-WI306-V2-001 | fixed World provider produce→verify | v2、root保持、exit 0 |
| IT-WI306-V2-002 | v2 root改竄 | attestationDigest mismatch、exit 1 |
| IT-WI306-V2-003 | v2 root欠落 / unknown schema | schema failure、exit 2 |
| IT-WI306-CLI-001 | top-level CLI + World public facade | v2を生成しrootはcurrent facade結果と一致 |
| IT-WI306-REG-001 | attestation全既存suite | v1 produce / verify挙動不変 |
| IT-WI306-WORLD-001 | rootだけ異なるv2 records | World projection bytes一致 |

E2Eはtemp repository、実filesystem repository、実SHA-256 adapterを使う。fragment digestをfixtureにもschemaにも追加しない。
