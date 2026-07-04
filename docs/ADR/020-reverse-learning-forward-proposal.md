---
adr_id: "020"
title: "単方向規律と逆流学習 — 逆流は前方草案を提案し、人が承認する"
status: Accepted
date: 2026-07-05
---

# 単方向規律と逆流学習 — 逆流は前方草案を提案し、人が承認する

## Context

`docs/folder_management_rules.md` §2 は、inception → product → src（実装）という **単方向のデータフロー** を定め、「逆流はフェーズゲートでブロックされます」と明記している。フェーズ依存レベル L1 → L2 → L3 は Quick Mode でも緩和不可である。

現時点で存在する唯一の「逆流的」機構は L4-001 `drift-detect` のみである。これは advisory・default-off・観測的（warning-only）であり、強制も自動更新も行わない（ADR-017 / ADR-018 / `docs/guide/layer-model.md` §L4 参照）。

汎用化ロードマップのアイデア (g) は「逆流学習（reverse learning）」— コードからの学習（design-smell 検出、pattern learning）— を求めている。ここには **逆流が「まずコードを書き、後から設計を埋める（code-first, backfill design later）」への裏口になる** リスクがある。それはフェーズゲートの中核規律を溶かす。

## Decision

単方向の **強制（enforcement）は維持され、交渉の余地はない。** 逆流が単一源（product / inception 文書）を直接書き換えることは決してなく、前方ゲート（forward gate）を緩和することも決してない。

逆流学習は、次の形でのみ許容する。

```
検出（detect）           : drift / smell を機械的に、または advisory な L4 層で表面化
   ↓
前方草案の生成（propose）  : inception の WI または ADR の草案（draft）を生成
   ↓
人が承認（approve）        : 承認された草案が通常の前方フローに再投入される
   ↓
機械的な前方ゲートで検証     : 他のいかなる設計変更とも同じゲートを通過する
```

- 逆流が生み出すのは **提案（proposal）のみ** である。ゲートを迂回するものは何もない。これにより単方向性を壊すことなく学習ループを閉じる。
- **ADR-019 との整合**: 草案生成のステップは AI スキル（生成側）を用いてよい。しかし trust は **人の承認 + 機械的な前方ゲート** が付与するのであって、AI が付与するのではない。
- **L4 との関係**: 検出は L4-001 `drift-detect` を拡張しうるが、L4-001 は **advisory / default-off のまま** である。本決定は L4 を blocking へ昇格させない。新しい要素は「前方草案の提案 + 人の承認」経路のみである。

## Consequences

- 「コードから学ぶ」という価値を取り込みつつ、背骨（単方向規律）を無傷に保つ。
- 提案 / 承認の機構が加わる（machinery のコスト）。rubber-stamp（形式承認）のリスクは、承認された草案が **他の設計変更と同じ前方ゲートを通過することを必須とする** ことで緩和する。
- 単一源の自動書き換え（auto-mutation）は行わない。逆流学習の恩恵は「人の承認を経た草案」に限られる。

## Alternatives

1. **逆流を advisory のみに留め、提案は行わない（検出 + 報告のみ）** — 能力が低く学習ループを閉じられないため不採用。

2. **前方草案の提案フロー（本決定で採用）** — 検出 → 前方草案の提案 → 人の承認 → 前方ゲートでの検証。

3. **双方向フローを全面的に排除する** — 「コードから学ぶ」価値を放棄することになるため不採用。

関連: ADR-019（「AI 非依存」の境界）、ADR-017（warning severity の集計）、ADR-018（drift-detect の design pointers）、`docs/folder_management_rules.md` §2、`docs/guide/layer-model.md` §L4。
