# WI-125 Logical Design

<!-- @work-item-id WI-125 -->

## Flow

1. `MarkdownRequirementSourceAdapter` が `docs/product/user_stories.md` から `HNN-NN` story と `AC-N` を抽出する。
2. `TypeScriptTestReferenceSourceAdapter` が test files の `@story` / `@work-item-id`、test name、file path を抽出する。
3. `GenerateRequirementTestMatrixUseCase` が要求と test reference を story 単位で突き合わせる。
4. 既存 matrix がある場合は同一 story / AC の人手 test reference を保持する。
5. handler / CLI が matrix を書き込み、unknown story / missing test / orphan test の report を出す。

## CLI

`phasegate:generate-matrix` を追加する。

| Option | Default | Meaning |
|---|---|---|
| `--requirements <path>` | `docs/product/user_stories.md` | AC 抽出元 |
| `--tests <glob-root>` | `scripts/harness/__tests__` | test metadata 抽出元 |
| `--out <path>` | `.harness/requirement-test-matrix.json` | matrix 出力先 |
| `--json` | false | JSON report |

生成後は `phasegate validate --layer L3` または `phasegate:impact-analysis <storyId>` が同じ matrix を読む。
