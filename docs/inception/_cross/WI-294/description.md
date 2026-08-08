---
id: WI-294
type: story
severity: high
status: tested
affects: [world-model]
source: internal
---

# WI-294: Versioned World control repositories

<!-- @work-item-id WI-294 -->

## 背景

WM-12でpure domainの`ConstraintRecord`とWCR evaluatorが完成した。Phase Bの次のsliceとして、ADR-035/037が外部宣言に分類したconstraint、adoption baseline、waiver、semantic debtをversioned JSON contractからadmitし、application-owned repository portを介してWorld domainへ渡せるようにする。

## スコープ

- `docs/contracts/world-{constraints,baseline,waivers,debts}.schema.json`
- 4 control fileのapplication-owned repository portとfilesystem adapter
- file不在のcanonical empty、unsupported schema / envelope failureのfail-closed result
- constraint declarationから`ConstraintRecord` / `MalformedConstraintDeclaration` / explicit relation / aliasへのmapping
- adoption baseline、waiver、semantic debtの必須fieldとsorted canonical projection
- duplicate record ID / violation fingerprintのno-winner admission
- reviewed control mutation用のtemp-file + atomic rename contract
- H17-08を`planned -> required`へ進め、同じ着地のtestで全ACをbindする

## スコープ外

- fingerprint生成、policy classification、obligation report導出（WM-14）
- `world:pin` / `world:derive` use case、CLI、write判断（WM-15）
- ci-governanceのpath / SHA-1 baseline import
- validator-systemのblocking policyとL2-017 / L3-008登録

## 受け入れ基準

- root control file名とschemaVersionがADR-037の正式契約に一致する。
- file不在だけをcanonical emptyとし、parse failure、schemaVersion欠落、unknown schema、I/O failureをemptyへ変換しない。
- supported constraints envelope内のmalformed recordは部分的`ConstraintRecord`にせずWCR-001入力として保持する。
- duplicate constraint ID、waiver ID / fingerprint、baseline fingerprint、debt IDにwinnerを選ばない。
- baseline / waiver / debtはADR-035の必須fieldを検証し、set-valued fieldをcanonical sortする。
- repository portはapplicationが所有し、filesystem / JSON schema / atomic rename詳細をinfrastructureへ閉じ込める。
- H17-08をrequiredへ進めたmatrixでL3-004を含むL3がPASSする。

## Coverage lifecycle 運用

WI-292のratchetに従い、本WIの実装testと同じ着地でH17-08を`planned -> required`へ進める。以後`required -> planned`へ戻さない。
