# WI-292 Logical Design: Catalog → matrix → L3-004

<!-- @work-item-id WI-292 -->

## 1. Flow

```text
docs/product/user_stories.md
  -> MarkdownRequirementSourceAdapter
  -> RequirementSourceDto.coverageStatus / coverageLifecycle
  -> RequirementTestMatrixDto 1.2
  -> schema validation
  -> StoryMapping
  -> AcCoverageGatePolicy
  -> validator-system L3-004
```

## 2. Parser

Story headingから次のlevel 1〜3 headingまでをscopeとし、coverage metadataを各1件だけ認める。duplicate、unknown value、invalid transition、status/history不一致はparse errorとしてmatrix生成を中止する。

省略は`required / [required]`。checkboxの`[ ] / [x]`は従来どおりcoverage lifecycleに使わない。

## 3. Matrix 1.2

各Storyへ次を追加する。

```json
{
  "coverageStatus": "planned",
  "coverageLifecycle": ["planned"]
}
```

1.0 / 1.1 inputでfield省略時はrequiredとして読む。generatorは1.2を出力する。planned StoryもAC mappingを全件保持する。

## 4. Policy

`AcCoverageGatePolicy`はlifecycle admissionを先に行う。不正ならcoverage判定へ進まずL3-004 error。plannedはtestReferences総数0の場合のみ未カバーを許容する。1件以上ならStory単位のtransition-required error。requiredは既存のAC単位errorを維持する。

## 5. World projection

matrix extractorは1.2をadmitし、coverageStatus / lifecycleをsemantic projectionへ含める。1.0 / 1.1はrequiredへ正規化する。projection semantics変更によりcompositionの`extractorVersion`を`phasegate-world-extractor/v2`へ進める。
