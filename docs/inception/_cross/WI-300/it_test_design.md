# WI-300 Integration Test Design

<!-- @work-item-id WI-300 -->

| ID | Scenario | Expected |
|---|---|---|
| IT-WI300-SCHEMA-001 | v2 / v3の完全World config | 両schemaで受理 |
| IT-WI300-SCHEMA-002 | unknown field / invalid path / limit | field path付きerror |
| IT-WI300-PRESET-001 | minimal / standard / strict store | 全presetにcanonical World defaults、enabled false |
| IT-WI300-RESOLVE-001 | config loadからWorld mapper | override / legacy fallbackを反映したDTO |
| IT-WI300-CLI-001 | `world.enabled:false`で明示command | dispatchをskipせず従来どおり実行可能 |

L2-017 / L3-008がregistryに未登録のままであることは既存registry goldenとtargeted testで回帰確認する。
