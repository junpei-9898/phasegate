# WI-120 Domain Model

<!-- @work-item-id WI-120 -->

- `SecurityTokenFamily`: named detector family with rule id and severity.
- `SecurityFinding`: redacted finding tied to file, line, and rule id.
- `SecurityAllowlist`: inline fixture/docs marker recognized by the scanner.
- `RedactedSecret`: display string that preserves token family context without exposing the value.
