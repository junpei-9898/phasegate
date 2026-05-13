# WI-178 Coverage Report

<!-- @work-item-id WI-178 -->

## Planned Coverage

| Acceptance criterion | Evidence |
|---|---|
| Claude-only setup validation does not block on Codex missing | setup planner integration test plus registry dogfood |
| Claude scope does not red Codex-only findings | doctor handler integration test |
| full/both doctor still detects Codex missing | existing golden fixture plus WI-178 full-scope assertion |
| JSON explains selected scope and not-applicable findings | doctor handler integration test |
| skills and troubleshooting explain the distinction | documentation diff and package dogfood |
