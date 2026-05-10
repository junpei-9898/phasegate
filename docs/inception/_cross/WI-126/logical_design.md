# WI-126 Logical Design

<!-- @work-item-id WI-126 -->

WI status derivation is owned by `traceability-model` because it already parses WI frontmatter and design annotations. The implementation adds a small vertical slice:

- Domain: `WorkItemStatusDerivationService` maps evidence to `drafted | reflected | implemented | tested`.
- Application: derive and apply use cases orchestrate evidence scanning and safe frontmatter updates.
- Infrastructure: a filesystem gateway scans inception WI directories, product docs, implementation files, and test files for `@work-item-id` evidence.
- Presentation: `work-items:status --dry-run|--apply` reports stale status or writes only the `status:` frontmatter line.

State rules:

- `story` / `issue`: reflected requires product reflection for every affected unit; implemented requires implementation evidence; tested requires test evidence.
- `refactor`: reflected requires product logical-design reflection; implemented requires implementation evidence; tested is allowed when annotated tests exist.
- `fix`: uses the documented shortcut path and stops at `implemented` when implementation evidence exists.
- `chore`: remains `drafted`; product reflection and implementation evidence are not required.

Mismatch policy is advisory by default. `--fail-on-stale` turns stale derived status into exit code 1 for CI or L2-style checks.
