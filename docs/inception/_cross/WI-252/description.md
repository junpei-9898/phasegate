---
id: WI-252
type: chore
status: completed
affects: [docs]
---

# WI-252: プロンプトインジェクション脅威モデルと信頼のルートを宣言する ADR を起草する

> 起票日: 2026-07-10
> 起票経緯: AI エージェント開発フローの普及に伴い、外部発コンテンツ（npm 依存・PR 由来ファイル・エージェントが読む Web コンテンツ）を経由したプロンプトインジェクションが懸念として浮上した。phasegate はこれを新規脅威として扱うか、既存の「洗浄を試みるエージェント」脅威モデルに還元するかの設計判断と、防御層のどこを「信頼のルート」とするかの宣言が未文書化だった。ユーザー承認済みの設計判断を ADR として正式化する。

## 背景

phasegate は元々「品質防御を洗浄（迂回）しようとするエージェント」を脅威として仮定してきた（ADR-006 / ADR-013 等）。プロンプトインジェクションで乗っ取られたエージェントは、正規権限を用いて防御を回避する「悪意ある内部者」として振る舞うため、既存の脅威モデルと同一に還元できる。

同時に、L0–L2（ローカル hook / pre-commit）は Bash を持つエージェントには原理的に偽造・迂回可能であり、「信頼のルート」とは呼べない。信頼のルートを L3 CI の再検証に置くこと、およびローカル秘密鍵/HMAC 方式を不採用とする理由を明文化する必要があった。

## 対応

`docs/ADR/030-injection-threat-model-and-trust-root.md`（status: Accepted）を新規作成し、ユーザー承認済みの以下を過不足なく記録した。

- 脅威モデル: インジェクションを既存「洗浄を試みるエージェント」脅威に還元し、対策を (1) 洗浄可能な残り穴を塞ぐ、(2) コンテンツが指示になる経路を減らす、の 2 軸に整理。
- 信頼のルート宣言: L0–L2 は fast-path（事故防止 + 早期停止）、authoritative は L3 CI の再検証（ハッシュ再計算・evidence 再実行）。ローカル秘密鍵/HMAC は不採用。
- 5 コンポーネント構成（実装順）: ① 指示ファイル整合性 pin、② coverage_report attestation ゲート、③ hook 出力 spotlighting、④ L3 advisory インジェクションスキャナ、⑤ deny 列挙 → allowlist 反転。
- 残存リスク (a)〜(d) の明記。

本 WI は docs のみを対象とし、ソース・テストは変更しない。

## 受け入れ基準

- [x] `docs/ADR/030-injection-threat-model-and-trust-root.md` が既存 ADR 番号体系・ファイル名規約・内部フォーマット（Context / Decision / Consequences / Alternatives）に従って作成される。
- [x] status が Accepted（ユーザー承認済み）である。
- [x] 承認済み設計判断（脅威モデル / 信頼のルート / 5 コンポーネント / 残存リスク）が過不足なく記録される。
- [x] `phasegate validate-adr` が新 ADR を valid と判定する。
- [x] `phasegate list-adrs` に新 ADR が掲載される。
- [x] ソース・テスト・package.json・fixture は変更しない。
