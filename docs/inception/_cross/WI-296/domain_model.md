# WI-296 Domain Model: CLI classifications

<!-- @work-item-id WI-296 -->

## PinCandidate

既存constraint ID、endpoint role、stable node ID、before / after content digest、changed flagを持つplain result。candidate解決はexact ID一件を優先し、exactなしの場合だけvalid single-hop alias target一件を使う。duplicate diagnostic、alias chain、ambiguous alias、missing targetではwinnerを選ばない。

## Derive verdict

reportのimmutable classificationからCLI exit categoryを導出する。

- success: structuralが`adopted-legacy | waived`だけ、repaid 0、policy diagnostic 0
- finding: `new-structural | invalid-declaration`、repaid、policy diagnosticのいずれか
- execution failure: schema / config / I/O / canonicalization / hashing / report persistence failure

exit code適用はpresentation責務だが、application resultはdomain findingとexecution failureを区別する。validator-systemのblocking boolean / severityは複製しない。
