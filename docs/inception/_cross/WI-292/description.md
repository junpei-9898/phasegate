---
id: WI-292
type: story
severity: high
status: tested
affects: [nyquist-validation, validator-system, world-model]
source: internal
---

# WI-292: Story coverage lifecycle と L3-004 ratchet

<!-- @work-item-id WI-292 -->

## 背景

CP-2でmatrixを再生成すると、WM-05で計画として先行登録したH17-07〜H17-12の33 ACがL3-004のblocking対象になった。現行Story catalog / matrixには、登録済み計画Storyとcoverage必須Storyを区別する正規機構がない。

本WIはStoryを非表示やallowlistへ隔離せず、Git-tracked catalogにcoverage lifecycleを明示し、matrixとL3-004へowner-derived statusを伝搬する。

## Coverage lifecycle contract

Story見出しscope内で次を使う。

```text
**Coverage status**: planned | required
**Coverage lifecycle**: planned | required | planned -> required
```

- status省略は`required`。
- lifecycle省略はderived status 1要素とする。
- 許可履歴は`planned`、`required`、`planned -> required`だけ。
- statusはlifecycle末尾と一致必須。
- `required -> planned`、`planned -> required -> planned`、status / history不一致はfail-closed。
- `planned`はmatrixに残し、ACと参照を可視化するが、未カバーACだけではblockingしない。
- `planned`にtest referenceが1件でもあればtransition漏れとしてL3-004 blocking。

## WM-12〜17の運用

H17-07〜H17-12は本WIで`planned / planned`にする。各WM-12〜17の実装WIは、該当Storyをテストと同じ着地点で次へ進める。

```text
Coverage status: required
Coverage lifecycle: planned -> required
```

statusだけ、テストだけ、または別commitで進めない。matrix再生成とL3-004 PASSを各着地点の必須検証にする。

## スコープ

- Story coverage metadata parserとmatrix 1.2 projection
- matrix schemaのcoverage status / lifecycle
- planned visibility、required coverage、planned reference failure、reverse transition failure
- validator-system L3-004 integration contract test
- world-model matrix owner projectionの1.2対応とextractor version更新
- H17-01〜06のexplicit required、H17-07〜12のexplicit planned

## スコープ外

- baseline / allowlist追加
- L3-004のrequired Story coverage緩和
- WorkItem frontmatter statusとの統合
- H17-07〜12の実装・test reference追加

## 受け入れ基準

- status省略Storyは従来どおりrequiredとしてL3-004が検査する。
- planned Storyはmatrixから省略せず、空参照だけをnon-blockingにする。
- planned Storyのtest reference、invalid lifecycle、status/history不一致はL3-004でfailする。
- required Storyの未カバーACは従来どおりfailする。
- H17-07〜12 planned化後、matrix再生成とL3全体がPASSする。
- `.harness/requirement-test-matrix.json`をcommitしない。
