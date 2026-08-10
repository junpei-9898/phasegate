# WI-390 Integration Test Design

<!-- @work-item-id WI-390 -->

| ID | 境界 | 前提 / Act | 期待結果 |
|---|---|---|---|
| IT-WI390-CONFIG-001 | hook process | valid config への Write | exit 2 / PROTECTED_FILE |
| IT-WI390-CONFIG-002 | hook process | missing config 作成 Write | exit 2、無関係 Bash は exit 0 |
| IT-WI390-CONFIG-003 | hook process | invalid JSON / schema config への Write | exit 2、doctor は完走 |
| IT-WI390-CONFIG-004 | hook process | config が自分を exclude 済み | non-excludable のため exit 2 |
| IT-WI390-HUSKY-001 | doctor CLI | temp git repo で core.hooksPath unset | `husky-runtime-inactive` red |
| IT-WI390-HUSKY-002 | doctor CLI | hooksPath が任意 path | red |
| IT-WI390-HUSKY-003 | doctor CLI | `.husky/_` だが shim 不在 | red |
| IT-WI390-HUSKY-004 | doctor CLI | `.husky/_` + current shim | runtime finding なし |
| IT-WI390-MD-001 | check-change-category CLI | nonexistent root `.md` / `.mdx` | docs / Full Mode 不要 |
| IT-WI390-MD-002 | check-change-category CLI | 単一不許可 category | CATEGORY_NOT_ALLOWED |
| IT-WI390-HOOK-001 | shell hook | single quote TypeScript を format | unrelated quote churn なし |
| IT-WI390-HOOK-002 | shell hook | PhaseGate lint green / raw Biome recommendation あり | false block しない |
| IT-WI390-HOOK-003 | shell hook | 編集対象に L1 violation | block と対象 error contract |
