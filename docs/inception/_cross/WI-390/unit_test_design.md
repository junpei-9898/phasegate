# WI-390 Unit Test Design

<!-- @work-item-id WI-390 -->

| ID | 対象 | 日本語テストケース | 期待結果 |
|---|---|---|---|
| UT-WI390-PROT-001 | ProtectedFileList | config を exclude に指定する | config は保護されたまま |
| UT-WI390-PROT-002 | ProtectedFileList | baseline / Husky を exclude に指定する | trust root は保護されたまま |
| UT-WI390-PROT-003 | ProtectedFileList | biome / package を exclude に指定する | 通常 default は除外される |
| UT-WI390-PROT-004 | ProtectedFileList | root agent instruction を照合する | protected と判定する |
| UT-WI390-GUIDE-001 | HandlePreToolUseUseCase | Husky protected block を作る | exclude recipe を含まず managed setup を含む |
| UT-WI390-GUIDE-002 | HandlePreToolUseUseCase | config protected block を作る | managed config path と human review を含む |
| UT-WI390-MD-001..004 | QuickModeJudgmentEngine | root/nested `.md` / `.mdx` CREATE を分類する | docs |
| UT-WI390-MD-005 | QuickModeJudgmentEngine | domain directory の `.md` を分類する | docs |
| UT-WI390-REJ-001 | QuickModeJudgmentEngine | 不許可1カテゴリ1ファイルを判定する | CATEGORY_NOT_ALLOWED |
| UT-WI390-REJ-002 | QuickModeJudgmentEngine | 不許可1カテゴリ複数ファイルを判定する | CATEGORY_NOT_ALLOWED |
| UT-WI390-REJ-003 | QuickModeJudgmentEngine | 許可・不許可カテゴリが混在する | MIXED_CHANGES |
| UT-WI390-HUSKY-001..004 | HuskyRuntimeState | active / unset / unsupported / shim missing を生成する | invariant を保持 |
| UT-WI390-HUSKY-005..008 | HuskyRuntimeInactiveCheck | runtime state を finding に写像する | active は null、他は red |
| UT-WI390-DOCTOR-001 | RunDoctorDiagnosticsUseCase | personal mode で runtime finding が返る | scopedOut へ移す |

全テストは semantic AAA、日本語 `it()`、観測結果 `actual`、domain object 実体を使用する。
新規テストには `@work-item-id WI-390` と既存 unit/layer metadata を付与する。
