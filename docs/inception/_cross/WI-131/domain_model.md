# WI-131 Domain Model

<!-- @work-item-id WI-131 -->

## Model

`RequirementIntentCoverage` は AC と test case の対応を test existence ではなく observation basis で評価する。

| Model | Fields | Responsibility |
|---|---|---|
| AcceptanceCriterionIntent | storyId, acId, text, expectedKeywords | product docs から得た期待ふるまい |
| TestObservationIntent | storyId, testName, assertionTarget, expectedOutcome | semantic test model から得た観測意図 |
| IntentCoverageItem | storyId, acId, status, warnings | observed / weakly-observed / unobserved を表す |

## Classification

- `observed`: test reference があり、assertion target / expected outcome が AC と対応する。
- `weakly-observed`: test reference または test name はあるが assertion target / expected outcome の根拠が弱い。
- `unobserved`: AC に対応する test reference がない。
- `metadata-mismatch`: `@story` / `@work-item-id` が不足または product docs と一致しない。
