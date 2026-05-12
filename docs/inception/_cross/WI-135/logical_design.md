# WI-135 Logical Design

<!-- @work-item-id WI-135 -->

Decision placement is an advisory semantic analysis. It reports likely business-rule, validation-rule, error-construction, state-transition, and policy-selection signals against the architecture zone responsibilities declared by the preset.

## Rollout

Findings start as warning/advisory with confidence and evidence. They are not hard failures until a project explicitly opts into stricter policy.

`L4-002` reports decision-placement findings through the same architecture consistency result surface as dependency checks. Each advisory includes observed zone, signal type, confidence, evidence, suggested owner zone, and rollout marker.
