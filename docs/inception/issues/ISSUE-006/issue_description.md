# ISSUE-006: Quick / Full モード選択の判定基準が暗黙で、採用者が毎回判断を迫られる

## ステータス

- **状態**: 🟢 **CLOSED (v0.64.0, 2026-04-23)** — Story A (v0.63.0) / Story B (v0.64.0) / P2-3 (v0.45.0) すべて着地済。受け入れ基準 P2-1a / P2-1b / P2-2 / P2-3 が機能的完遂。外部PJ再レビューは welcome-but-not-blocking として形式的 CLOSE
- **起票日**: 2026-04-18
- **更新日**: 2026-04-23（機能的完遂を確認、formal CLOSE）

## 実装履歴

| Story / 版 | 内容 |
|---|---|
| P2-3 (v0.45.0) | `docs/guide/quick-vs-full-mode.md` 新規作成 |
| Story A (v0.63.0) | H10-05: `fullModeRequiredWhen` 設定駆動化 + `phasegate check-change-category` CLI |
| Story B (v0.64.0) | H11-05: pre-tool-use hook に Full mode 必須検出を統合（agent-integration → quick-mode 経由） |
- **発見契機**: 他PJ（Conductor）ドッグフーディング中の FB 「phasegate のステップに沿って実装していくのは過剰か、適切か」。AIDLC フルフェーズ運用の負荷と、Quick Mode への切り替え基準が暗黙である点が論点として浮上。
- **影響Unit**: harness-api（quick-implementor / story-implementor 選択ロジック）, ci-governance（phasegate.config.json スキーマ）, ドキュメント（採用ガイド）
- **深刻度**: P2（機能は動くが、採用者の認知負荷が高く、誤用リスクと overkill 批判の根拠になっている）
- **優先度**: P2 — 既存ユーザーの運用には致命的でないが、ドッグフーディング FB で最も再現性のある批判であり、中期的な採用障害

## 問題の概要

`phasegate.config.json` には既に `quickMode.allowedCategories`（`bugfix` / `docs` / `test` / `config`）が定義されているが、**「目の前の変更がどのカテゴリに該当するか」「Full を強制すべき変更は何か」の判定基準が文書化・自動化されていない**。結果として:

1. **毎回ユーザーが手動判断**: `story-implementor` を起動するか `quick-implementor` を起動するかを自然言語で自分で選ぶ必要がある
2. **誤用の余地が大きい**: 「新機能の軽微な追加だから Quick でいいか」のような自己正当化で Quick に流れる経路を塞げていない
3. **overkill 批判の根拠化**: ソロ開発・小規模PJで「全部 Full にしている」と感じる要因が、判定基準の不在に起因している可能性が高い

検証者（他PJ）からの定性評価を要約:
- AIDLC フルフェーズは API 契約・ドメインモデルの固さが要る箇所では ROI が高い
- 一方で CLI フラグ追加や内部 utility の bugfix まで Full を通すのは重い
- Quick Mode の存在は自認されているが、**「いつ Quick に切り替えるか」の基準が暗黙**

## 確認された問題（severity 順）

### P2-1. 「Full 強制条件」が config にも実装にも存在しない

**影響**: API 契約変更・新ドメインモデル追加のような、本来 Full 必須の変更が Quick で通ってしまう経路がある。`quick-implementor` スキルの説明文にはスコープ除外が書かれているが、**機械的ブロックが無い**。

**現状**:
- `phasegate.config.json` の `quickMode.allowedCategories` は「Quick を許す」ホワイトリスト側のみ定義
- 「Full 必須」のブラックリスト側（契約影響・ドメインモデル追加）は定義されていない
- `quick-implementor` スキルの説明は自然言語ガイダンスに留まり、pre-tool-use hook で検出されない

**根本原因**: `phasegate.config.json` スキーマに `fullModeRequiredWhen` 相当の条件記述子が無い。

**修正案**:
1. `phasegate.config.json.quickMode` に `fullModeRequiredWhen` を追加:
   ```json
   {
     "quickMode": {
       "allowedCategories": ["bugfix", "docs", "test", "config"],
       "fullModeRequiredWhen": {
         "contractChange": true,
         "newDomainModel": true,
         "newUseCase": true,
         "publicApiChange": true
       }
     }
   }
   ```
2. pre-tool-use hook で `quick-implementor` 起動時に変更対象パスを検査し、`docs/product/contracts/` や新規 `domain/` ファイル作成を検知したら Full に誘導
3. `story-implementor` / `quick-implementor` のスキル説明に「機械的ブロック条件」を追記

**関連コード**:
- `phasegate.config.json:28-44` — quickMode スキーマ定義
- `skills/quick-implementor/` — スコープ記述の自然言語ガイダンス
- pre-tool-use hook 配置場所（要調査）

---

### P2-2. 変更内容からのカテゴリ自動推定が無い

**影響**: ユーザーは「これは bugfix か? config か? test か?」を毎回自然言語で宣言する必要があり、Claude 側も宣言を信じるしかない（検証経路が無い）。

**現状**: `allowedCategories` は4値あるが、ユーザーが指定した category が実際の変更内容と整合しているかを検証する仕組みが無い。例えば「bugfix」と宣言しつつ新規ファイルを3つ作る、といった逸脱が検出されない。

**修正案**:
1. `phasegate check-change-category --paths <paths>` サブコマンド追加
   - 変更対象ファイルのパスパターン（`__tests__/` → test、`docs/` → docs、既存ファイルの小規模変更 → bugfix 候補、新規 domain ファイル → 該当なし = Full 必須）から category を推定
2. `quick-implementor` の Phase 1 冒頭でこのコマンドを呼び、宣言 category と推定 category の不一致があれば警告 or Full に誘導
3. 推定ロジックは `scripts/harness/quick-mode/` 配下に UseCase として配置

**関連コード**:
- 新規作成: `scripts/harness/quick-mode/application/use-cases/infer-change-category-usecase.ts`
- 既存: `scripts/harness/quick-mode/` 全般

---

### P2-3. Quick/Full 選択判断の運用ドキュメントが不在

**影響**: 新規採用者が phasegate の採用粒度を決める際、既存の `skills/*/README.md` を横断で読む必要があり、学習曲線が急。他PJ FB の「overkill か」「適切か」という迷いは、このドキュメント不在が直接の原因。

**現状**: `docs/guide/` 配下に Quick/Full の選び方、想定される運用パターン（コア = Full、周辺 = Quick）、判定フローチャートが存在しない。

**修正案**:
1. `docs/guide/quick-vs-full-mode.md` 新規作成
   - 判定フローチャート（Mermaid 図）
   - 典型ケーススタディ（「API 追加」「内部リファクタ」「bugfix」「新ドメイン追加」それぞれの推奨モード）
   - ソロ/小規模PJ向けの運用推奨（コアだけ Full、周辺は Quick の二層運用）
2. `README.md` から `docs/guide/quick-vs-full-mode.md` への導線追加
3. `phasegate init` 時のテンプレ `.claude/CLAUDE.md` に運用ガイドの要約を埋め込む

**関連コード**:
- 新規: `docs/guide/quick-vs-full-mode.md`
- 更新: `README.md`, `templates/claude-md/`

---

## 非対象（スコープ外）

- **AIDLC フェーズ数の削減**: フル AIDLC が重いという批判はあるが、フェーズ削減は phasegate の設計思想の根幹に触れるため本issueでは扱わない
- **AI 駆動のカテゴリ自動分類**: LLM で変更内容を分類する案はあり得るが、phasegate は「AI非依存」が設計原則のため、本issueの `check-change-category` は静的ルールに限定する

## 受け入れ基準

- [x] `phasegate.config.json.quickMode.fullModeRequiredWhen` スキーマが定義され、バリデートされる（v0.63.0 / H10-05）
- [x] pre-tool-use hook が Write/Edit 時に Full 必須条件を検出してブロック（`FULL_MODE_REQUIRED`）する（v0.64.0 / H11-05）
- [x] `phasegate check-change-category --paths <paths>` が実装され、推定 category を返す（v0.63.0 / H10-05）
- [x] `docs/guide/quick-vs-full-mode.md` が存在し、README から参照されている（v0.45.0）
- [~] 他PJ FB 提供者に再レビューしてもらい「判定基準が明示されて迷わなくなった」という確認を得る（welcome-but-not-blocking。CLOSE 時点では未確認だがブロック要因にはしない）

## 関連

- ドッグフーディング FB（Conductor PJ）2026-04-18
- ISSUE-005（CLI / validator の機能不具合）と独立。本 issue は機能不具合ではなく「採用体験の欠陥」
- `skills/quick-implementor/` — 現行の自然言語ガイダンス
- `skills/story-implementor/` — 現行の自然言語ガイダンス
