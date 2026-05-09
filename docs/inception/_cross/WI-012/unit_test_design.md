# Unit Test Design: WI-012

<!-- @work-item-id WI-012 -->

| ID | Target | Expected |
|---|---|---|
| WI012-UT-001 | `runPreCommit` | Default config still ignores `.py` and handles `.ts`. |
| WI012-UT-002 | `runPreCommit` | `.py` staged files are sent to L2 when `.py` is configured. |
| WI012-UT-003 | AJV schema | `preCommit.implementationExtensions: [".ts", ".py"]` is valid. |
| WI012-UT-004 | AJV schema | Empty extension list is invalid. |
