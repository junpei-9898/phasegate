# WI-295 Integration Test Design: Obligation report persistence

<!-- @work-item-id WI-295 -->

real WM-13 filesystem repositories、attestation public SHA capability、World adapter、canonical serializer、atomic writerをtemp project rootで統合する。

| ID | Case | Expected |
|---|---|---|
| IT-WI295-DER-001 | valid declarations + evaluation | schema-valid reportとgolden bytes |
| IT-WI295-DER-002 | 同一inputを2回、input array順変更 | byte-identical report |
| IT-WI295-DER-003 | existing reportを手編集後にpure derive | derived bytes不変、existing report readなし |
| IT-WI295-DER-004 | `writeReport=false` | `.harness/world-obligations.json`不在 |
| IT-WI295-DER-005 | `writeReport=true` | canonical bytesをatomic write、temp file残置なし |
| IT-WI295-DER-006 | write failure | report classification不変、persistence failed、旧complete file保持 |
| IT-WI295-DER-007 | unknown policy schema | invalid-policy-input、empty fallback / report writeなし |
| IT-WI295-DER-008 | policy dateだけ変更 | raw fingerprint不変、policy digest / evaluation ID変更 |

H17-09 AC-1〜6をunit / integration testへ明示bindし、matrix regeneration後にL3-004がrequired StoryとしてPASSすることを確認する。
