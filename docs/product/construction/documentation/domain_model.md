# ドメインモデル: documentation

@story-id HF2-01
@story-id HF2-02
@work-item-id WI-116
## Public L4 Validator State

Public documentation represents the user-visible validator catalog. L4-004 `doc-freshness` and L4-005 `pointer-validation` are registered validators, while the `p2:*` commands are compatibility entry points.
<!-- @work-item-id WI-132, WI-133, WI-136, WI-137, WI-138 -->
## G4 Documentation Contract Annotations

Documentation may declare opt-in semantic contract records using `@phasegate-contract` and test observations using `@phasegate-observation`. These annotations let public docs participate in L2-015 without requiring every Markdown heading to become a contract.
