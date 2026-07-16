# WI-302 Logical Design: L3-008 wiring and trust boundary

<!-- @work-item-id WI-302 -->

## Flow

```text
resolved phasegate config
  -> toValidatorSystemConfig().world
  -> HarnessConfigValidatorConfigAdapter
       world.enabled=false -> L3-008 explicit skip
       world.enabled=true  -> L3-008 selected
  -> RunL3ValidatorsUseCase
  -> WorldConstraintRederivationPolicyPort
  -> WorldModelConstraintRederivationAdapter
  -> createWorldModelModule(rootDir, resolvedConfig)
  -> deriveWorldObligationsUseCase.execute(writeReport=false)
       reads: current corpus + versioned control declarations
       never reads: .harness/world-obligations.json
  -> WorldConstraintRederivationService
  -> ValidationResult L3-008
```

## Independent derive boundary

adapterは`collect()`ごとにworld-model public composition facadeからfresh moduleを構築する。入力はrepository rootとresolved World configだけで、generated obligation reportのpath、reader、cached evaluationを依存に持たない。`writeReport:false`を固定し、reportの存在・内容・削除を同一fixture上で変えてresult不変をcontract testにする。

## Config and registration

`L3-008` definitionはregistryへ常設する。resolved `world.enabled:true`の場合だけL3 validator IDsへforce-includeし、false / absentではforce-excludeする。明示`world:*` commandは従来どおりこのswitchに依存しない。self-repo configは本WIで変更しない。

## Policy boundary

Worldはimmutable obligationとclassificationまでを返す。RunL3はdomain serviceを通じ、`new-structural` / `invalid-declaration`と全derive diagnosticをerror、`adopted-legacy` / `waived`をwarningへ写像する。HarnessErrorは`ruleId`とfingerprintを保持し、保存reportを証拠として引用しない。

## CI fixture strategy

base corpus、new unpinned claim、duplicate ID、unknown constraint schemaをfilesystem fixtureで再導出する。各blocking mutationはexact rule IDとcanonical fingerprintを検査する。report tamper testは同じmutationに対してreport absent / forged / deletedの3状態を作り、port observationおよびRunL3 resultの一致を検査する。
