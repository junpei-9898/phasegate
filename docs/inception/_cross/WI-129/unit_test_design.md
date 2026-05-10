# WI-129 Unit Test Design

<!-- @work-item-id WI-129 -->

## Cases

| ID | Case | Expected |
|---|---|---|
| UT-WI129-001 | valid TypeScript test with Arrange/Act/Assert and `actual` observation | passes |
| UT-WI129-002 | English test name | `L2-003` warning for naming |
| UT-WI129-003 | assertion exists but no named Act observation | `L2-003` warning |
| UT-WI129-004 | one test case has two Act observations | `L2-003` warning |
| UT-WI129-005 | Assert targets a value other than Act observation | `L2-003` warning |
| UT-WI129-006 | domain-layer test mocks domain/internal module | `L2-003` warning |
| UT-WI129-007 | lifecycle/E2E test with repeated Act/Assert steps | passes |
| UT-WI129-008 | parameterized test case with semantic AAA | passes |

