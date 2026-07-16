# WI-286 Unit Test Design: SHA-256 public contract

<!-- @work-item-id WI-286 -->

@story-id H17-01

## 1. Policy

- test名は日本語。
- Arrange / Act / Assertを分離し、Actは一回。
- domain objectはmockしない。
- pure helper testでは外部portである`Sha256Capability`だけをfakeにする。
- expected bytes / digestはproduction implementationから導出しない。

## 2. Cases

| ID | Target | 日本語テストケース名 | Assert |
|---|---|---|---|
| UT-WM286-001 | `hashUtf8` | non-ASCII文字列をTextEncoderのUTF-8 bytesへ変換する | fake capabilityが受けたbytesが`TextEncoder`結果と一致 |
| UT-WM286-002 | `hashUtf8` | capabilityのplain digestを変更せず返す |戻り値がfakeのdigestと一致 |
| UT-WM286-003 | `NodeCryptoContentHasherAdapter` | public capabilityのplain digestをattestation-local Digestへ変換する | `Digest.value`が同値 |
| UT-WM286-004 | `NodeCryptoContentHasherAdapter` | stringをUTF-8 helper経由で一度だけhashする | capability callが1回、input bytesが一致 |

## 3. ADR-033 mapping

| Existing design | WM-06 coverage |
|---|---|
| UT-WM283-HASH-001 | integration known bytes |
| UT-WM283-HASH-002 | UT-WM286-001 + integration non-ASCII |
| UT-WM283-HASH-003 | world-model adapter実装時へ継続 |
| UT-WM283-HASH-004 | UT-WM286-003 |
| UT-WM283-HASH-005 | public export / import boundary scan |
| UT-WM283-HASH-006 | repository SHA-256 call-site count |
