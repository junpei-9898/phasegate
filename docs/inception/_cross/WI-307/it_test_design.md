# WI-307 Integration Test Design

<!-- @work-item-id WI-307 -->

| ID | Scenario | Expected |
|---|---|---|
| IT-WI307-CLI-001 | `KNOWN_HARNESS_COMMANDS`とroot dispatch | inspect / pin / deriveが全て存在 |
| IT-WI307-CLI-002 | empty corpusで3 command JSON実行 | `phasegate-world-cli/v1`、command一致、成功はexit 0 |
| IT-WI307-CLI-003 | pin済みendpoint missing | v1 envelope、domain finding exit 1、control file無変更 |
| IT-WI307-CLI-004 | invalid config / unsupported control schema | v1 envelope、execution failure exit 2 |
| IT-WI307-CI-001 | self-repo workflow source order | test < matrix < derive < L3 < attest < verify < integrity |
| IT-WI307-CI-002 | self-repo derive二回 | raw stdout byte-identical、exit 0 |
| IT-WI307-TPL-001 | `ci:generate-template --type aidlc-gate --render` | bundled sourceと一致し、conditional World stageを含む |
| IT-WI307-PACK-001 | `npm pack --dry-run` | template、World / attestation schemas、guideを同梱 |
| IT-WI307-ATT-001 | self-repo warning-only ci-checkから`attest --require-pass` | exit 0、v2 evidenceに`worldSnapshotRoot` |
| IT-WI307-ATT-002 | IT-WI307-ATT-001のevidenceをverify | exit 0、v1 corpus verifyも非破壊 |

CLI fixtureはreal filesystemとactual process boundaryを使う。World domainをmockせず、minimal canonical corpusとversioned declarationを組み立てる。self-repo full suite / attestation v1-v2 / SessionStart determinismはCP-5でorchestratorが最終確認する。
