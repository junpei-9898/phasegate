# WI-201 IT Test Design

## CLI Contract Tests

| Case | Command | Expected |
|------|---------|----------|
| Retrofit dry-run stays read-only | `phasegate config:plan --intent retrofit-bootstrap --json` | `configPatch.applicability = "applicable"` and no file write |
| Retrofit apply mutates config | `phasegate config:plan --intent retrofit-bootstrap --apply --json` | exit 0, `changed:true`, backup path present, `phasegate.config.json` contains the after values |
| Non-applicable intent refuses apply | `phasegate config:plan --intent codex-hooks --apply --json` | non-zero exit with a structured refusal that no config patch is applicable |
| Unknown flags remain strict | `phasegate config:plan --intent retrofit-bootstrap --output x` | exit 2 unknown flag |

## Hook Guidance Tests

| Case | Input | Expected |
|------|-------|----------|
| Config edit is blocked with config-plan recovery | pre-tool-use `Edit` targeting `phasegate.config.json` under strict quick-mode config | exit 2, includes `config:plan --intent retrofit-bootstrap --dry-run` and `--apply` guidance |
| Non-config edit keeps generic full-mode guidance | pre-tool-use `Edit` targeting a domain/api path | exit 2, keeps `/story-implementor` design guidance |
