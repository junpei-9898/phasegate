# WI-307 Domain Model: CI trust-chain contract

<!-- @work-item-id WI-307 -->

## CiWorldGateProjection

CI / templateが既存public commandから観測する運用contractであり、新しいWorld domain entityではない。

| Field | Meaning |
|---|---|
| `enabled` | resolved config由来のautomatic World integration selection |
| `firstDeriveBytes` | pure `world:derive --json`の一回目stdout |
| `secondDeriveBytes` | 同一checkout / matrix / control inputでの二回目stdout |
| `deriveExitCode` | ADR-037の0 / 1 / 2 |
| `deterministic` | 二出力のbyte equality |

`deterministic=true`かつ両derive exit 0だけが次のauthoritative L3へ進める。保存`.harness/world-obligations.json`は入力にも比較対象にもせず、二回ともpure modeとする。

## ProductionEvidenceChain

順序付きCI contractを次で固定する。

```text
tests -> generated matrix -> World pure derive x2 -> authoritative L3
      -> attestation v2 produce -> attestation verify -> integrity verify
```

matrixはgenerated owner index、World derive / L3はcurrent corpus re-derivation、attestationはgate-run evidence、integrityはinstruction corpus trust rootをそれぞれ所有する。後段の成功を前段の代替証拠にしない。

## PublicWorldCliContract

regression-suiteは`world:inspect` / `world:pin` / `world:derive`の公開contractだけを固定する。

- canonical command catalog: `KNOWN_HARNESS_COMMANDS`
- JSON discriminator: `phasegate-world-cli/v1`
- exit 0: trustworthy non-blocking result
- exit 1: trustworthy domain / obligation finding
- exit 2: trustworthy resultを作れないusage / schema / I/O failure

World内部entity、port、fingerprint生成をregression-suiteへ複製しない。

## Policy-consistent CiCheckResult

`CiCheckResult`はvalidator-systemのraw resultをCI policyで公開用に射影するharness-api Value Objectである。

- `allPassed`は`failOnWarning`を適用した全itemのgreen判定である。
- public `validatorResults[].passed`も同じpolicyを適用する。warning-only failureは`failOnWarning:false`で`true`、`true`で`false`となる。
- `skipped`は独立したgreen stateとして保持し、raw `passed`を上書きしない。
- `errors[]`はseverityを含めlosslessに保持するため、warningの可視性は失わない。

公開不変条件は`allPassed === validatorResults.every(item => item.passed || item.skipped)`である。validator-systemのraw `Result.passed`自体は変更しない。
