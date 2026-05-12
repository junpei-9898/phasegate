# 論理設計: setup

## WI-086 / WI-087 / WI-090 Initialization and Deployment Feedback

<!-- @work-item-id WI-086, WI-087, WI-090 -->
@story-id H09-01
Setup commands generate hook assets and guidance from explicit CLI options. Workspace-aware defaults, supported skill set flags, and post-init next steps are surfaced through deterministic output so initialization failures or typoed flags do not silently fall back to unintended behavior.
# Public Setup CLI Reflection

@work-item-id WI-150

Setup lifecycle documentation must match public help: `init`, `install`, `doctor`, `uninstall`, `reconcile`, `update-skills`, `scaffold-wi`, and `emit-agent-rules` are binary subcommands. JSON variants for `install`, `doctor`, `uninstall`, and `reconcile` are automation contracts.
