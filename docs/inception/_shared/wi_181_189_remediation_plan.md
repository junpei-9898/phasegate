---
traceability:
  initial_creation: true
---

# WI-181..189 Remediation Plan

作成日: 2026-05-14

## 目的

GitHub issue 再現確認で起票した WI-181..189 を、downstream 利用者への影響、依存関係、同時修正の効率に基づいて対応順へ整理する。

## 対応方針

最優先は packaged / installed downstream project で即座に壊れる contract mismatch とする。次に false green や health surface の矛盾のように CI 判断を誤らせる問題を扱う。最後に CLI help、dry-run/apply、no-op message などの UX / documentation consistency をまとめて直す。

## 推奨グループ

### P0: Downstream install / package contract breakage

package と install template の利用直後に失敗するため、最初にまとめて扱う。WI-182 と WI-183 は template generator / installer の同じ contract を触る可能性が高い。

| WI | 理由 | 推奨まとめ方 |
|---|---|---|
| WI-181 | packaged tarball で runtime dependency が欠落し、skill cascade update が missing dependency で止まる。 | 単独の小修正として先行可能 |
| WI-182 | installed pre-commit が monorepo-only `scripts/harness/main.ts` を参照する。 | WI-183 と同じ template batch |
| WI-183 | generated AIDLC workflow が nonexistent script / pnpm 固定を含む。 | WI-182 と同じ template batch |

Exit criteria:

- `npm pack` 相当の packaged 実行で missing runtime dependency が出ない。
- `install --dry-run` と `ci:generate-template --render` が downstream-safe command を出す。
- package manager / monorepo dogfood / downstream npm install の境界が product docs と guide に反映される。

### P1: Validator correctness and gate trust

false green や health command の矛盾は CI / agent 判断を誤らせるため、P0 の次に扱う。WI-185 と WI-186 は validator semantics、WI-188 は expensive runner に入る前の入力検証として分ける。

| WI | 理由 | 推奨まとめ方 |
|---|---|---|
| WI-185 | downstream cwd の docs を scan せず、P2 freshness / pointer validation が 0 件 PASS になる。 | validator path resolver batch |
| WI-186 | `validate` / `complete-check` / `status` の verdict が矛盾し、どれを gate とするか分からない。 | health surface contract batch |
| WI-188 | nonexistent story ID でも vitest / network path に進み、actionable error を返さない。 | skill-quality input validation batch |

Exit criteria:

- downstream cwd と explicit file path の resolver semantics が test で固定される。
- health command matrix と top-level status の意味が実装・help・docs で一致する。
- `skill:check-coverage --story` は story existence を runner 起動前に検証する。

### P2: Doctor / migration repair semantics

repairHint の no-op は agent automation をループさせるため、P1 の後に単独で扱う。migration 対象にするか、ai-assisted finding に下げるかの設計判断が必要。

| WI | 理由 | 推奨まとめ方 |
|---|---|---|
| WI-187 | doctor が mechanical repair を提示するが、`migrate work-items --apply` は 0 件 no-op になる。 | 単独 batch |

Exit criteria:

- `doctor -> repairHint -> doctor rerun` で finding が解消されるか、解消不能なら mechanical repair として出さない。
- `_shared` ad-hoc plan を自動移行する場合は採番、配置先、frontmatter の contract が明確である。

### P3: Skill catalog CLI

normal severity だが help に載る command が fatal になるため、UX cleanup より先に直す。影響範囲は比較的小さい。

| WI | 理由 | 推奨まとめ方 |
|---|---|---|
| WI-184 | `phasegate skills list` が undefined accumulator で即時 fatal になる。 | 単独の focused fix |

Exit criteria:

- skill 0 件でも exit 0 / structured output が安定する。
- `skills list` と `skills info` が同じ catalog source を使う。

### P4: Umbrella CLI UX / documentation consistency

高優先度 WI に切り出した H の中核は WI-182 / WI-183 で先に解消し、残りの help / dry-run / no-op / hidden command をまとめて整える。

| WI | 理由 | 推奨まとめ方 |
|---|---|---|
| WI-189 | `validate --format json`、bypass no-op message、`scaffold-design` write contract、help inconsistency、hidden command recommendation、delegate help などの umbrella UX 問題。 | P0/P1 後の cleanup batch |

Exit criteria:

- write-side command の `--dry-run|--apply` contract が統一される。
- main help、command help、`config:plan` recommendation が矛盾しない。
- no-op message が実際の check mode と一致する。

## 推奨実行 batch

1. Batch A: WI-181
2. Batch B: WI-182, WI-183
3. Batch C: WI-185
4. Batch D: WI-186
5. Batch E: WI-188
6. Batch F: WI-187
7. Batch G: WI-184
8. Batch H: WI-189

## 実行上の注意

- 各 batch は実装前に対象 unit の product construction に `@work-item-id` 反映を揃える。
- P0 は packaged tarball または isolated downstream fixture で回帰確認する。
- P1 は current repo と temporary downstream repo の両方で検証し、false green を防ぐ assertion を入れる。
- WI-189 は umbrella のまま巨大化させず、P0/P1 で既に直した項目は完了確認だけに留める。
- #14 と #15-I は未再現のため、この計画には含めない。再現条件が揃ったら別 WI として起票する。
