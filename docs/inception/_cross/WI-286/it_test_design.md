# WI-286 Integration Test Design: SHA-256 facade and adapter

<!-- @work-item-id WI-286 -->

@story-id H17-01

## 1. Scope

public root barrel、composition factory、Node.js crypto implementation、attestation internal adapterの接続を実物で検証する。

## 2. Cases

| ID | 日本語テストケース名 | Arrange | Assert |
|---|---|---|---|
| IT-WM286-001 | public capabilityで既知bytesのSHA-256を返す | `abc` UTF-8 bytes | NIST既知digestとexact一致 |
| IT-WM286-002 | UTF-8 helperでnon-ASCII文字列を決定的にhashする | 固定日本語文字列 | known digestとpatternが一致 |
| IT-WM286-003 | public helperと既存adapterのstring hashを同値にする | 同じ固定string | plain resultと`Digest.value`が一致 |
| IT-WM286-004 | root barrelが内部hashing typeを公開しない | source export scan / type import | `Digest` / `ContentHasherPort` / concrete class exportがない |
| IT-WM286-005 | SHA-256 node:crypto call siteを増やさない | implementation source scan | primitiveが新capabilityへ移動し総数不変 |
| IT-WM286-006 | attestation produce→verifyが同じdigest contractでround-tripする | existing E2E fixture |既存resultがgreen |

## 3. Regression boundary

attestation unit / integration test全体を実行し、record schema、canonical payload、input digest、verify結果が変わらないことを確認する。full suiteの既存sandbox subprocess failureはRED/GREEN差分と分離する。
