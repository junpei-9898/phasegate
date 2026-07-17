# WI-307 Logical Design: CI, template, and regression integration

<!-- @work-item-id WI-307 -->

## Self-repo workflow

`.github/workflows/ci.yml`の各Node matrix laneはtest後にmatrixを再生成する。続けて`world:derive --json`を二つのrunner temp fileへ出力し、`cmp`でbyte equalityを検査する。pure commandのexit 1 / 2と`cmp`不一致はいずれもstep failureである。次に既存`phasegate:ci-check --json`をauthoritative L3として実行し、成功後にrunner tempへattestation v2をproduce / verifyし、最後にintegrityを再計算検証する。

attestation出力をroot `.harness`へ書かないことでrepository corpusやsubsequent laneにgenerated evidenceを残さない。top-level `phasegate:attest`がWorld public root providerを配線するためv2になる。

## Warning-only result contract correction

修正点はharness-apiの`CiCheckResult`公開境界一箇所とする。validator-systemはfindingの生事実としてwarning-only validatorを`passed:false`で返し得るが、`CiCheckResult`はaggregateに使った`failOnWarning`と同じ判定を各public itemへ適用する。既定falseならwarning-only itemを`passed:true`へ射影し、`errors[]`のwarningは削除しない。trueなら射影せずfailとなる。

attestation adapterでseverityを再解釈する案は採用しない。adapterはci-checkのpublic contract consumerであり、policy判定を複製すると将来のconsumer間でgreen判定が分岐するためである。attestationのINV-1（gate pass iff validator set is green）は緩和せず、v1 / v2 mapper・entityも変更しない。

調査ではproduction codeで`phasegate:ci-check`の`data.validatorResults`をgate evidenceへ変換するconsumerはattestation adapterだけだった。status表示はvalidator execution portのraw resultを別経路で使うため、本修正の対象外である。WI-260の`failOnWarning` opt-in contractは維持し、config / CLI policy配線の拡張は本WIで行わない。

## Bundled `aidlc-gate`

配布templateはtest commandをproject横断に安全に推定できないため、既存lintの後にmatrix generationを実行し、その後World selection / derive、L3を実行する。selection stepは`phasegate.config.json`をNodeでstrict JSON parseし、top-level `world.enabled === true`だけをGitHub outputへ書く。

- true: pure deriveを二回実行してbyte compareした後、L3へ進む。
- false / absent / config file absent: World deriveだけをskipし、従来lint / L3を維持する。
- invalid JSON: selection step自体をfailし、disabledへfallbackしない。

明示World commandがconfig無効でも実行できるADR-037 contractと、automatic integrationを`enabled`で選ぶWM-18 contractを区別する。scheduled L4 `consistency-check`は責務外なので変更しない。

## Regression suite

新しいE2E contract testはtemp corpusを使い、main dispatchを実processで呼ぶ。catalog集合、3 commandのv1 envelope、read-only success、missing endpoint domain failure、malformed config / control input execution failureを固定する。既存World feature E2Eの実装詳細を再検査せず、配布可能なtransport contractだけをproduction regressionとして保持する。

## Package boundary

production sourceの新規barrel / commandは追加しない。`npm pack --dry-run`のfile listで`docs/templates/ci/aidlc-gate.yml`、`docs/contracts/attestation-v2.schema.json`、World control / obligation schemas、`docs/guide/cli-reference.md`を検証する。
