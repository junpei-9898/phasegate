# WI-290 Integration Test Design: Runtime / evidence fixtures

<!-- @work-item-id WI-290 -->

@story-id H17-05

## 1. Fixture layout

`scripts/harness/__tests__/fixtures/world-model/runtime-corpus/`にimplementation / test TypeScript、matrix 1.1、attestation v1、integrity v1とinvalid variantsを置く。testはtemporary repositoryへcopyし、public SHA capabilityとpublic attestation verify handlerを接続する。

## 2. Cases

| ID | Fixture | 期待 |
|---|---|---|
| IT-WM290-001 | minimal-valid | implementation / test SourceFile、matrix TestReference、attestation、integrity facts |
| IT-WM290-002 | reordered / volatile variants | matrix generatedAt・array順、attestation volatile差でsemantic projection不変 |
| IT-WM290-003 | duplicate / unsupported variants | no-winner / hard diagnostic |
| IT-WM290-004 | optional files absent | 3 providerの`not-present` observation |
| IT-WM290-005 | public import scan | attestation / nyquistのpublic index以外のimportが0件 |
| IT-WM290-006 | no-new-crypto scan | world-model内`node:crypto` call site 0件 |

## 3. CP-1 handoff

WM-10 targeted test後、CP-1でWM-06〜10をまとめてfull suite、同fixture二重Snapshot化、absolute root / ordering / LF差のdeterminism、全diagnosticのsilent-omission防止を検証する。
