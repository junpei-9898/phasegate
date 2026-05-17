# WI-202 IT Test Design

## Integration Test Cases

| ID | Scenario | Setup | Expected |
|---|---|---|---|
| IT-WI202-001 | strict workflow init generates valid Quick Mode categories | temp project で `phasegate init --workflow strict --agent codex --yes` | `quickMode.allowedCategories` が Quick Mode category enum と SKILL.md 方針に整合する |
| IT-WI202-002 | `.gitignore` quick change under strict workflow follows policy | IT-WI202-001 の project で `.gitignore` Edit payload を pre-tool-use hook に渡す | 方針上許可なら exit 0、block なら quick-implementor 向け guidance を返す |
| IT-WI202-003 | config file direct edit remains protected or managed | strict workflow project で `phasegate.config.json` Edit payload を hook に渡す | direct write は block され、managed CLI path を案内する |
| IT-WI202-004 | caller skill context customizes guidance | `caller_skill: "quick-implementor"` を含む hook payload | `/story-implementor` 固定誘導ではなく quick-implementor 文脈の復帰策を返す |
| IT-WI202-005 | missing caller skill preserves compatibility | caller context なしの既存 payload | 現行互換の fallback guidance を返す |

## Dogfood Regression Command

```bash
phasegate init --name issue27-regression --workflow strict --agent codex --yes
phasegate check-change-category --paths .gitignore --format json
printf '%s' '{"cwd":"<tmp>","tool_name":"Edit","tool_input":{"file_path":"<tmp>/.gitignore","old_string":"","new_string":"node_modules\n"}}' \
  | phasegate hook pre-tool-use
```

The final assertions depend on the selected policy in `logical_design.md`, but the test must pin both behavior and message.
