# WI-217 IT Test Design

## Reproduction Contract

| Test ID | Scenario | Steps | Expected |
|---|---|---|---|
| IT-WI217-PERSONAL-L4002-001 | personal inception exists, product missing | Create temp git repo, run `phasegate install --personal --agent codex --apply`, enable L4, create `.phasegate-local/inception/ID/ID-09/ID-09-02/description.md`, leave `.phasegate-local/product/construction` empty, run `phasegate validate --layer L4 --format json`. | L4-002 runs and reports missing product reflection for `ID-09-02`. |
| IT-WI217-PERSONAL-L4004-001 | explicit `paths.designDocs` scopes freshness | Same temp repo, add stale `docs/explanation/adr/ADR-0000-old.md`, run `phasegate validate --layer L4 --format json`. | L4-004 does not report the root `docs/explanation/adr` file when config design root is `.phasegate-local/product/construction`. |
| IT-WI217-PERSONAL-HOOK-001 | personal hook checks local docs | Stage `.phasegate-local/inception/.../description.md` without matching product reflection and run the installed pre-commit hook with local PhaseGate command. | Hook fails or warns according to strictness with a consistency finding tied to the WI ID. |
| IT-WI217-SCAFFOLD-001 | scaffold honors personal root and custom ID | In personal repo, run `phasegate scaffold-wi ID issue --id ID-09-02` with configured personal inception root/layout. | Generated path is under `.phasegate-local/inception` and frontmatter `id` is `ID-09-02`. |

## Regression Contract

| Test ID | Scenario | Expected |
|---|---|---|
| IT-WI217-COMPAT-001 | Existing default repo runs `phasegate scaffold-wi validator-system issue`. | Still creates `docs/inception/validator-system/WI-XXX/description.md`. |
| IT-WI217-COMPAT-002 | Existing repo with normal `docs/product/construction` runs L4. | Freshness and consistency behavior remain compatible except for newly visible missing-reflection findings. |
| IT-WI217-COMPAT-003 | `p2:check-freshness --pattern ".phasegate-local/**"` is used directly. | Existing p2 command semantics are unchanged. |

## Manual Dogfood

After implementation, repeat the original Issue #30 temp-repo reproduction and record:

- `phasegate validate --layer L4 --format human`
- `phasegate validate --layer L4 --format json`
- `phasegate scaffold-wi --help`
- `phasegate scaffold-wi ID issue --id ID-09-02`
- installed personal `.git/hooks/pre-commit` content and behavior with staged `.phasegate-local/inception/**`
