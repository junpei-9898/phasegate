# WI-119 Domain Model

<!-- @work-item-id WI-119 -->

- `ImportGraphData`: source-analysis contract containing nodes, edges, unused export candidates, and unreachable ranges.
- `ImportGraphNode`: file path plus exported symbol names.
- `ImportGraphEdge`: importing file, resolved target file, imported names, and edge kind.
- `DeadCodeReport`: reviewable L4-003 advisory report.
- `DeadCodeExclusion`: reason a file or export is outside dead-code review, such as `entrypoint`, `public-api`, `test`, `fixture`, or `generated`.
