---
id: WI-140
type: issue
severity: high
status: tested
affects: [traceability-model, validator-system, quick-mode, config-foundation]
source: internal
---

# WI-140: Work item status derivation must become a CI-enforced green evidence gate

> 起票日: 2026-05-10
> 起票経緯: WI-126 publish / dogfood 後の review で、`work-items:status` により WI frontmatter `status` を機械導出・safe apply できるようになった一方、現状は dedicated command の advisory 運用であり、`tested` 判定も主に `@work-item-id` 付き test evidence の存在に依存していることを確認した。

## 背景

WI-126 で `work-items:status --dry-run|--apply` が追加され、current status / derived status / reason / next action の report と frontmatter `status:` 行の安全な書き戻しが可能になった。

ただし、PhaseGate の完了状態として信頼するには以下が不足している。

- stale status detection が L2 / CI の通常導線に接続されていない。
- `tested` が「test file evidence exists」寄りで、該当 validator / test run が green であることを status 条件に含めきれていない。
- stale mismatch の severity / advisory / fail policy が config と public docs で正式 contract 化されていない。
- report の reason / next action は人間向け文字列が中心で、agent や CI が構造的に扱うには弱い。

このまま WI-129 などの test-quality 強化を進めると、「品質 validator は落ちているが WI frontmatter は `tested` のまま」という状態が残り得る。先に WI status derivation を gate として接続し、完了状態の信頼性を上げる。

## 本 WI でやること

1. `work-items:status --fail-on-stale` 相当を L2 validator または `validate --layer L2` 経路に接続する。
2. status mismatch の default policy を定義する（local report は advisory、CI/pre-commit では fail など）。
3. `tested` 判定に green evidence を追加する。少なくとも `validate` / 該当 test command / last run result のどれを信頼するかを contract 化する。
4. `WorkItemStatusReport` を agent / CI が扱いやすい structured fields に拡張する（missing artifacts / missing units / missing tests / blocking validation など）。
5. `--apply` の安全 policy を強化する（downgrade 既定禁止、`--allow-downgrade`、`--changed-only` などの必要性を設計する）。
6. README / guide / product docs に、WI status gate の運用手順と publish 前チェックを反映する。

## 受け入れ基準

- [ ] `validate --layer L2` または同等の標準 gate で stale WI status を検出できる。
- [ ] stale WI status の detection が CI で fail signal として利用できる。
- [ ] `tested` status が test evidence の存在だけでなく green evidence を考慮する。
- [ ] `work-items:status --dry-run --json` が structured next action / missing evidence を返す。
- [ ] `--apply` が unintended downgrade を起こさない policy を持つ。
- [ ] WI-129 以降の test-quality 強化前に、status と validator result が矛盾しにくい状態になっている。

## 非スコープ

- WI-129 の framework-agnostic AAA / assertion quality 強化そのもの。
- Nyquist matrix 自動生成（WI-125）。
- AC 観測強度や requirement-to-test intent coverage の本格化（WI-131）。

## 関連

- WI-126: Work item status must be derived and updated by PhaseGate
- WI-129: L2 test-quality validator must enforce framework-agnostic AAA semantics
- WI-125: L3 Nyquist requirement-test matrix must be generated automatically
- WI-131: Requirement-to-test intent coverage must verify observed acceptance criteria
- `scripts/harness/traceability-model/`
- `scripts/harness/validator-system/`
