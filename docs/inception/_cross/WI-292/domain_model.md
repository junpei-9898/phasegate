# WI-292 Domain Model: Story coverage lifecycle

<!-- @work-item-id WI-292 -->

## 1. CoverageStatus

```text
CoverageStatus = planned | required
```

`required`はcoverage gate対象、`planned`はcatalog / matrixで可視だが未カバーだけではblockingしない。

## 2. CoverageLifecycle

有効な状態列は次だけ。

```text
[required]
[planned]
[planned, required]
```

current statusは末尾要素である。不正列や不一致をfallbackせずL3-004 findingへ変換する。省略status / lifecycleはlegacy `[required]`。

## 3. StoryMapping

`StoryMapping`はStory ID、AC mappingに加えcoverage status / lifecycleを保持する。policyは次を評価する。

- required: 全ACに1件以上のtest reference
- planned + refなし: visible non-blocking
- planned + refあり: transition漏れ
- invalid / reverse lifecycle: blocking

## 4. Ownership

nyquist-validationがcoverage lifecycle projectionとL3-004 policyを所有する。validator-systemはL3実行とblocking result transportを維持する。world-modelはmatrix 1.2 public DTOをowner-aware factとして観測し、status policyを複製しない。
