---
id: WI-120
type: issue
severity: normal
status: tested
affects: [validator-system, ci-governance]
source: internal
---

# WI-120: L3 security scanner must be hardened for practical secret detection

> 起票日: 2026-05-09
> 起票経緯: L3-001 security scanner review で、現状は少数の regex pattern による secret-like string 検出に留まっており、実務 secret scanning としては allowlist / fixture 除外 / token family / entropy handling が不足していることを確認した。

## 背景

L3-001 はセキュリティ validator として登録済みで、API key / password / OpenAI key 形式の検出を行う。一方、実務では GitHub / AWS / GCP / Slack / npm token など複数 family、test fixture の明示許可、false positive 抑制、検出結果の秘匿表示が必要になる。

これは新しい security product の追加ではなく、既存 L3-001 を CI gate として信頼できる水準へ上げる改善である。

## 本 WI でやること

1. 検出対象 token family と severity を定義する。
2. entropy / structured token / keyword context を組み合わせた検出方式にする。
3. test fixture / docs example / generated sample の allowlist 機構を設計する。
4. secret 値を report に露出しない redaction を保証する。
5. consumer project でも利用できる設定 surface を docs に残す。

## 受け入れ基準

- [x] OpenAI / GitHub / AWS / npm など代表 token family の fixture を検出できる。
- [x] docs example や dummy token fixture を allowlist できる。
- [x] report に secret 実値が出力されない。
- [x] false positive を抑えるための rule id / ignore comment / config がある。
- [x] L3-001 が CI で hard gate として使える運用説明を持つ。

## 関連

- WI-108: `phasegate:ci-check` must match its documented L2-L4 contract
- WI-112: `phasegate:status` must report trustworthy, non-stale state
