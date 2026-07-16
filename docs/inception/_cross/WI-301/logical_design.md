# WI-301 Logical Design: L2-017 wiring

<!-- @work-item-id WI-301 -->

## Flow

```text
resolved phasegate config
  -> toValidatorSystemConfig().world
  -> HarnessConfigValidatorConfigAdapter
       world.enabled=false -> L2-017 explicit skip
       world.enabled=true  -> L2-017 selected
  -> RunL2ValidatorsUseCase
  -> WorldConstraintAdmissionPolicyPort
  -> WorldModelConstraintAdmissionAdapter
  -> createWorldModelModule(...).deriveWorldObligationsUseCase (writeReport=false)
  -> WorldConstraintAdmissionService
  -> ValidationResult L2-017
```

## Adapter boundary

adapterは`world-model/index.ts`のpublic `createWorldModelModule`だけをimportする。World domain型、repository、WCR serviceへのdeep importは禁止する。adapterはplain observationへ変換し、blocking / severityを決めない。

## Config and skip semantics

`L2-017` definitionはregistryへ常設する。resolved `world.enabled`がtrueの場合だけL2 `validatorIds`へforce-includeし、false / absentではforce-excludeする。このため`validate --layer L2`は8 contractsを返し、self-repo既定では7実行 + L2-017 skipとなる。explicit `world:*` commandは従来どおりconfig switchの影響を受けない。

## Fast-path boundary

L2はcurrent checkout / local policy inputからpure deriveするが、local fileとbaselineは改竄可能である。error対象はconstraint admission failure、`WCR-001`相当、baselineにないnew structural findingに限定する。adopted legacyとactive waiverはwarning表示のみ。repaid baseline、ruleset migration、policy input全体のauthoritative判定はWM-20のL3-008へ委譲する。

## Failure contract

- supported schema内のmalformed record: `invalid-declaration` / WCR-001 error
- unknown / malformed constraints document: constraint-scoped admission error
- baseline外new pin / claim finding: `new-structural` error
- adopted baseline: warning
- non-constraint derive diagnostic: warningとし、L3 authoritative re-derivationを要求

warningは既存aggregationの`failOnWarning`契約に従う。default falseではnon-blockingだが、結果から消さない。
