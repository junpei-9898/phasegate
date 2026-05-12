# WI-120 Logical Design

<!-- @work-item-id WI-120 -->

L3-001 security scanning combines structured token family regexes, keyword context, entropy scoring for generic secrets, fixture/docs allowlisting, and mandatory redaction. Findings must never include the raw secret value.

## Detection Families

- OpenAI project/API keys
- GitHub PAT and fine-grained style tokens
- AWS access keys
- npm tokens
- Slack bot/user/app tokens
- Keyword-context secrets such as `password`, `api_key`, and `token`

## Suppression

`phasegate-allow-secret-fixture` can be used in tests/docs examples. The finding includes a rule id so future config-based suppression can target a family without exposing values.
