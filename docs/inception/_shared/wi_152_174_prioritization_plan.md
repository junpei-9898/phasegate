---
traceability:
  initial_creation: true
---

# WI-152..174 Prioritization Plan

作成日: 2026-05-13

## 目的

WI-149..151, WI-158 のリリース後に残る WI-152..174 を、依存関係とリリース価値に基づいて対応順へ整理する。

## 優先順位

### P0: Setup contract foundation

最初に扱う。後続 WI の用語、managed target、doctor finding、公開 guide の前提になる。

Status: 完了済み (2026-05-13)。`docs/guide/setup-artifacts.md` を追加し、public guide / product construction / bundled setup guidance skills / DEVELOPMENT / skills README を同期した。

| WI | 理由 | 推奨まとめ方 |
|---|---|---|
| WI-152 | setup artifact inventory の正本。全 setup / onboarding / agent automation の語彙を固定する。 | WI-153, WI-169 と同一 batch |
| WI-153 | doctor が suggestedSkill として返す guidance skill が現行 lifecycle を処理できる必要がある。 | WI-152 と同時 |
| WI-169 | install / doctor / uninstall / reconcile の product construction 正本化。public docs だけ直しても product 側が古いと再発する。 | WI-152 と同時 |
| WI-157 | legacy setup artifact の扱い。WI-152 に吸収できる範囲は吸収し、削除 / archive 判断だけ残す。 | WI-152 の一部または小 follow-up |
| WI-154 | DEVELOPMENT / skills README の陳腐化解消。setup 用語確定後に同じ batch で処理する。 | P0 batch の最後 |

Exit criteria:

- setup artifact が managed target / generated artifact / runtime state / legacy artifact / user-level setting に分かれている。
- doctor finding, repairHint, suggestedSkill, manifest, hook / CI / Husky target の説明が product docs と public docs で一致する。
- `DEVELOPMENT.md` / `skills/README.md` が setup lifecycle と skill 数で公開 guide と矛盾しない。

### P1: Validator and JSON contract foundation

P0 の次。validator catalog と JSON payload は他の product reflection の基準になる。

Status: 完了済み (2026-05-13)。`L2-015` / `L4-004` / `L4-005` を含む validator catalog、Quick Mode exact-ID contract、contract traceability guide、status/drift JSON semantics、G5 operational validator payload、CI/L4 rollout、pointer freshness semantics を public guide / product construction / quick-mode runtime に反映した。

| WI | 理由 | 推奨まとめ方 |
|---|---|---|
| WI-159 | validator catalog / execution contract の親。L2/L3/L4 と Quick Mode の意味を先に固定する。 | P1 batch 1 |
| WI-160 | contract traceability coverage の public / product 展開。WI-159 の catalog 決定に依存する。 | P1 batch 1 の後半 |
| WI-161 | G5 operational validators の product contract。security / performance / dead-code / config knobs をまとめて扱う。 | P1 batch 2 |
| WI-162 | status / detect-drift / semantic payload schema。公開 JSON contract と product schema を固定する。 | WI-166 と連携 |
| WI-164 | pointer freshness semantics。L4-004 / L4-005 を WI-159 と合わせる。 | WI-159 後 |
| WI-163 | CI template / L4 rollout。live validator registry と fail-on-warning 方針が決まってから扱う。 | P1 の締め |

Exit criteria:

- validator ID, layer execution, skip / advisory / fail-on-warning, Quick Mode の挙動が product docs と guide で一致する。
- status / drift / pointer / contract traceability の JSON payload の主要キーと読み方が固定される。
- CI template と scheduled L4 rollout が validator catalog に追従する。

### P2: Product reflection and catalog cleanup

P0/P1 の正本化後にまとめて行う。ここを先にやると、後で terminology が再変更されやすい。

Status: 完了済み (2026-05-13)。product unit catalog / ADR / integration contract の旧 validator catalog 再導入を防止し、legacy annotation と Work Item reflection の境界、hook skip observability、coverage/test design refresh を product/public docs に反映した。

| WI | 理由 | 推奨まとめ方 |
|---|---|---|
| WI-155 | legacy annotation 依存を減らし、product docs の traceability を揃える。 | P2 batch |
| WI-165 | coverage report / test design の追随確認。WI-159..164 と WI-168..169 後が適切。 | P2 batch の最後 |
| WI-167 | product unit boundary / catalog cleanup。独立可能だが、上位 contract と合わせると効率がよい。 | WI-168 と同時 |
| WI-168 | product unit / integration contract / ADR registry。上位文書が旧 validator catalog を再導入しないようにする。 | WI-167 と同時 |
| WI-166 | hook skip observability の product reflection。WI-162 の status schema と整合させる。 | WI-162 後、P2 に含める |

Exit criteria:

- product construction, product unit catalog, ADR, coverage report が旧 catalog / 旧 Unit / legacy annotation だけに依存しない。
- WI-117..148 以降の横断 reflection が coverage / test design まで追える。
- hook skip observability が agent-integration と harness-api status schema の両方から説明できる。

### P3: User onboarding and agent-driven setup

公開体験として価値は高いが、P0/P1 の contract が固まる前に着手すると手戻りが大きい。

| WI | 理由 | 推奨まとめ方 |
|---|---|---|
| WI-171 | first-time user onboarding。P0 の setup contract と P1 の validation semantics を recipe に落とす。 | P3 batch 1 |
| WI-174 | AGENTS.md / CLAUDE.md を managed setup target にする。setup lifecycle の拡張なので WI-169 後がよい。 | P3 batch 1 または P4 |
| WI-172 | agent-driven setup orchestrator。実装を伴う大きい機能なので、docs/skills が固まってから着手する。 | P3 batch 2 |
| WI-173 | agent configuration change workflow。WI-172 の判断モデルを初回後の変更に拡張する。 | WI-172 後 |

Exit criteria:

- README から first-run / daily-use / CI-use / agent-use の導線が辿れる。
- agent context file が setup 状態と同期し、既存 user content を壊さない。
- setup orchestrator / config change workflow は dry-run / apply / rollback / validation の判断を持つ。

### P4: Conditional or defer

| WI | 理由 | 推奨判断 |
|---|---|---|
| WI-170 | `p2:check-initial-creation` と `phase2Extensions.initialCreationExpirationRules` を public contract にする場合のみ必要。 | WI-156 の guardrail 方針後に go / no-go |
| WI-156 | drift guardrails は重要だが、何を guardrail 化するかは P0/P1 の修正後に確定する。 | P0/P1 の後、少なくとも command/script drift, install target drift, skill count drift から着手 |

## 推奨実行 batch

1. Batch A: WI-152, WI-153, WI-169, WI-157, WI-154
2. Batch B: WI-159, WI-160, WI-164
3. Batch C: WI-161, WI-162, WI-163, WI-166
4. Batch D: WI-167, WI-168, WI-155, WI-165 (完了済み)
5. Batch E: WI-171, WI-174
6. Batch F: WI-172, WI-173
7. Batch G: WI-156, WI-170 decision

## 実行上の注意

- Batch A/B/C は product docs への `@work-item-id` 反映を先に揃えてから実装または public docs を更新する。
- WI-156 は guardrail 実装 WI として扱い、単なる docs cleanup batch に混ぜない。
- WI-174 は user-owned `AGENTS.md` / `CLAUDE.md` を壊すリスクが高いため、structured merge / uninstall / reconcile のテストを厚くする。
- Batch ごとに `phasegate:check-ready`, 関係 validator, public CLI dogfood を実施する。
