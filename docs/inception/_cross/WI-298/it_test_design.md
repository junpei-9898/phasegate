# WI-298 Integration / Dogfood Test Design

<!-- @work-item-id WI-298 -->

| ID | Scenario | Expected |
|---|---|---|
| IT-WI298-MSR-001 | baselineなしself-repo二重derive | bytes / fingerprint集合一致 |
| IT-WI298-MSR-002 | rule / corpus / Unit inventory | deterministic count、合計一致 |
| IT-WI298-ADM-001 | reviewed baseline適用 | current集合=baseline、全件adopted |
| IT-WI298-ADM-002 | baseline増分 / stale entry | new / repaidを0と確認 |
| IT-WI298-DEBT-001 | semantic debt import | debt ID一件、structuralとは別collection |
| IT-WI298-CLI-001 | self-repo `world:derive --json`二重実行 | byte-identical、exit 0 |

testは`.harness/requirement-test-matrix.json`を正規generatorで先に再生成する。matrixの`generatedAt`はWorld projectionから除外されるため、同一checkoutのderive bytesを変えない。

