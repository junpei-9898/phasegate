# WI-177 Unit Test Design

<!-- @work-item-id WI-177 -->

## Cases

| Case ID | Target | Expectation |
|---|---|---|
| UT-WI177-001 | `likelyCauseFor` / install error mapping through CLI observable output | Incompatible parent path errors are not described as generic managed target failures. |
| UT-WI177-002 | Claude managed template rendering | Rendered `CLAUDE.md` includes the post-readiness workflow and product reflection route. |

Direct unit exposure for the private error helpers is not required; WI-177 verifies the contract through integration-level CLI output because the public behavior is the structured install/setup JSON.
