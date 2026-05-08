---
id: WI-089
type: chore
severity: normal
status: implemented
affects: [skills, setup, docs]
github_issue: null
reporter: junpei-9898
related: [WI-088]
---

# WI-089: WI-088 guidance skills の dogfood feedback 反映 (P1-P5 + cohesion audit)

> 起票日: 2026-05-08
> 起票経緯: WI-088 で追加した `phasegate-toolkit-guide` / `phasegate-config-doctor` を dogfood 検証 (`/tmp/phasegate-dogfood-wi088` で `npx phasegate@0.124.0 init` → 模擬 user query で skill 動作確認) した結果、5 項目の改善要望と内部の冗長 / 凝集度 / 矛盾箇所を検出した。

## 背景

WI-088 の dogfood で確認できたこと:

- ✅ 両 skill の deploy 経路は機能 (npm tarball 同梱 → init で 30 skills deploy)
- ✅ canonical doc pointer 戦略 (skill 本文に概念を埋めず、`node_modules/phasegate/docs/guide/*.md` を Read させる) は機能
- ⚠️ ただし fresh init 時の診断ノイズ・WI 番号ノイズ・指示重複・凝集度の低さなど、UX 課題が複数存在

## スコープ (P1, P2, P4, P5 + cohesion audit)

dogfood 評価で挙げた 5 改善案のうち以下を本 WI で対応:

- **P1**: `phasegate init` 完了メッセージに guidance skill の存在を 1 行追記 (discoverability の根本改善)
- **P2**: `phasegate-config-doctor` に「fresh init 判定」を追加 — 空 scaffold には「まず AIDLC start を推奨」のショートカット応答
- **P4**: `phasegate-config-doctor` の「適用フロー」を `AskUserQuestion` ベースに書き換え
- **P5**: 両 skill から WI-XXX 言及を削除 (consumer に意味のない実装履歴ノイズ)
- **cohesion audit**: 下記の重複・凝集度・矛盾を解消

### スコープ外 (別 WI)

- **P3**: canonical doc の日本語化 / 各 doc に日本語サマリ section 追加 — 9-10 docs 横断で分量大、別 WI (WI-090 候補) で扱う
- guidance skill 本体の機能拡張 (新 trigger カテゴリ追加など)

## Cohesion audit 結果 (本 WI で修正対象)

### `phasegate-toolkit-guide`

#### 冗長 (同じ rule の重複記述)

| # | 重複箇所 | 内容 |
|---|---|---|
| R1 | "重要な設計原則" + "アンチパターン" 第 4 項 | 「skill 本文に概念解説を書き加えない」 |
| R2 | "回答プロセス" Step 4 + "回答時のスタイル" 第 2 項 | 「該当セクションへのポインタを含める」 |
| R3 | "重要な設計原則" + "アンチパターン" 第 1 項 | 「training data 依存で答えない / canonical doc を読んでから答える」 |

#### 凝集度

| # | 問題 | 対応 |
|---|---|---|
| C1 | "## マッピングが曖昧な場合" / "## 設定変更を伴う質問" / "## アンチパターン" が散在 | 「境界条件と禁止事項」セクションに統合 |
| C2 | "回答プロセス" + "回答時のスタイル" が分離 | 統合 (Step 4 内で言及) |

#### WI-XXX 言及 (P5 削除対象)

- 概念カテゴリ 4 (Hook 仕様): 「`Responsibility Separation` セクション (WI-086 で追加)」「`agentIntegration.stopHook.enforce` オプションは WI-087 Phase C-2 で追加された」
  - → 「`Responsibility Separation` セクションに ... 表がある」「`agentIntegration.stopHook.enforce` オプションあり」に書き換え

### `phasegate-config-doctor`

#### 冗長

| # | 重複箇所 | 内容 |
|---|---|---|
| R4 | "重要な設計原則" 第 1 項 + Step 3 末尾 + "アンチパターン" 第 3 項 | 「silent 書き換え禁止 / ユーザー確認」 |
| R5 | "重要な設計原則" 第 2 項 + "アンチパターン" 第 2 項 | 「schema を読んでから提案」 |
| R6 | "出力例 (簡易)" + Step 3 提案フォーマット | 同じ output 形式の二重提示 |

#### 凝集度

| # | 問題 | 対応 |
|---|---|---|
| C3 | 観点 1 (schema バージョン) と 観点 3 (architecture.preset) が「architecture キー存在」を別観点で扱う | 観点 1 に統合し「architecture key 不在 → v2 扱い + preset 推奨をまとめて提示」 |
| C4 | "アンチパターン" の各項目が "重要な設計原則" の裏返しで分離 | 設計原則を肯定形に正規化し、アンチパターンセクションは削除 |
| C5 | "出力例 (簡易)" は Step 3 と内容重複で凝集度低下 | 削除 |

#### 矛盾 / 曖昧

| # | 矛盾箇所 | 修正方針 |
|---|---|---|
| X1 | 観点 4 paths: 「default のままで実プロジェクトのパスに合っていれば OK」だが、path が **存在しない** ケースの判定が未定義 | 「Read tool で path 配下をリストし、存在 + 中身ありなら OK / 存在しないなら scaffold 期と判定」と明示 |

#### WI-XXX 言及 (P5 削除対象)

- 観点 8: 「(WI-087 Phase C-2)」 → 「(v0.122 以降)」に書き換え
- 観点 9: 「`phasegate init` を再実行すれば WI-087 Phase B の自動検出が効く」 → 「`phasegate init` を再実行すれば monorepo 自動検出が効く」
- 観点 9: 「WI-087 v0.119 未満で deploy された hook script (mapfile 使用)」 → 「v0.119 未満で deploy された hook script (bash 4 mapfile 使用)」
- アンチパターン: 「memory `feedback_dogfood_before_release.md` 適用」「memory ...」 → consumer 文脈で意味不明、削除

### P2: fresh init shortcut

`phasegate-config-doctor` の Step 1 と Step 2 の間に **Step 1.5 (fresh init 判定)** を新設:

判定条件 (全て満たすと fresh init):
- `phasegate.config.json` が `phasegate init` 直後の default 状態 (project.preset = "standard" / architecture.preset 設定済 / その他空 dict)
- `docs/product/construction/` が空 or 不在
- `scripts/` 配下に Unit 構造 (domain/application/etc.) が無い

該当時の応答:
```
このプロジェクトは phasegate init 直後の状態のため、config を最適化するより先に
AIDLC を start することを推奨します:

  /product-architect

product-architect で Unit を作り、いくつかの logical_design を書いた後で本 skill を再実行すると、
実態に基づいた具体的な改善提案ができます。
```

該当しない場合のみ Step 2 (9 観点診断) に進む。

### P4: AskUserQuestion ベースの適用フロー

Step 4 (適用) の冒頭を以下に書き換え:

```markdown
### Step 4: 適用 (AskUserQuestion 経由)

提案件数に応じて以下を使い分ける:

- 提案 1-3 件: `AskUserQuestion` で「全て適用 / 個別選択 / 何もしない」を提示
- 提案 4 件以上: 優先度高 (WARN) を先に AskUserQuestion で確認し、SUGGEST はバッチ提案

option 形式 (例 1 件):
- 「W1 を適用 (推奨)」
- 「適用しない (情報のみ受け取る)」
```

### P1: phasegate init 完了メッセージ

`scripts/harness/main.ts:550-559` の "Next steps" 出力に guidance skill 案内を追加:

```diff
 console.log("Next steps:");
 if (skillSet === "core") {
   console.log("  1. Core skills only — quality defense tools are ready");
 } else {
   console.log("  1. Run the product-architect skill to start AIDLC");
 }
 console.log("  2. Customize phasegate.config.json if needed");
+console.log("");
+console.log("Need help?");
+console.log("  • Q&A about phasegate concepts: invoke /phasegate-toolkit-guide");
+console.log("  • Diagnose & tune phasegate.config.json: invoke /phasegate-config-doctor");
```

`skill-set: core` の場合は guidance skill が deploy されないので、この案内も skip する条件分岐を入れる。

## 受け入れ基準

- [x] `phasegate-toolkit-guide/SKILL.md` から R1-R3 の重複・C1-C2 の凝集度・WI-086/087 言及 (P5) が解消されている
- [x] `phasegate-config-doctor/SKILL.md` から R4-R6 の重複・C3-C5 の凝集度・X1 の矛盾・WI-087 言及 (P5) が解消されている
- [x] `phasegate-config-doctor/SKILL.md` に Step 1.5 (P2 fresh init shortcut) が追加されている
- [x] `phasegate-config-doctor/SKILL.md` の Step 4 (P4 AskUserQuestion) が書き換わっている
- [x] `scripts/harness/main.ts` の init 完了メッセージ (P1) が拡張され、`skillSet !== "core"` 時に guidance skill 案内が出る
- [x] skill-creator の `quick_validate.py` で両 SKILL.md が validation pass (両者 `Skill is valid!`)
- [x] 全テストグリーン (3499 tests pass、init message 変更による既存テスト影響なし)
- [x] L1 / L2 (metadata, test-quality) 維持 (`npx phasegate lint` で No violations found)
- [x] CHANGELOG に v0.125.0 として WI-089 を記載
- [x] minor version bump (0.124.0 → 0.125.0)
- [ ] dogfood: publish 後、別 PJ で `npx phasegate init` を実行し Next steps の guidance skill 案内が出ることを確認 (publish 後)

## スコープ外 (再掲)

- **P3 (canonical doc 日本語化)** — 別 WI (WI-090 候補) で扱う。9 docs 横断、分量大
- skill 本体機能拡張 (新 trigger カテゴリ追加 / phasegate-troubleshoot 新設など)
- skill-deployer ロジック改修 (本 WI は SKILL.md 内容と init メッセージのみ)

## 関連

- WI-088 (`docs/inception/_cross/WI-088/description.md`) — 本 WI で改善する skill の起票元
- `skills/phasegate-toolkit-guide/SKILL.md` — 修正対象
- `skills/phasegate-config-doctor/SKILL.md` — 修正対象
- `scripts/harness/main.ts:550-559` — P1 修正対象
- WI-086 / WI-087 — P5 で削除対象の言及元 (consumer 視点で historical noise)

## リリース手順

1. SKILL.md 編集 (Edit tool 直接 — 既存 skill の修正なので skill-creator 経由は不要、 memory `feedback_use_skill_creator_for_new_skills.md` は新規作成限定)
2. main.ts 編集
3. CHANGELOG / package.json 更新 (v0.125.0)
4. WI-089 description.md 進捗ログ追記
5. commit (Work-Item: WI-089 trailer 必須)
6. tag v0.125.0 + push origin main --tags
7. user に publish を委ねる (`npm publish --auth-type=web`)
8. publish 後 dogfood: 別 PJ で init 実行 → Next steps の guidance skill 案内表示確認

## 教訓フィードバック (memory 適用)

- `feedback_use_skill_creator_for_new_skills.md`: 本 WI は **既存 skill の修正** で skill-creator は新規作成限定のため適用外。Edit で直接修正する
- `feedback_dogfood_before_release.md`: skill 修正でも実 deploy + 模擬 query で動作確認すること
- `feedback_npm_publish_auth_type_web.md`: publish は `--auth-type=web` 固定、`--otp` は使わない

## 進捗ログ

### v0.125.0 完了 — 2026-05-08

WI-088 dogfood 検証で挙げた P1 / P2 / P4 / P5 + cohesion audit を反映:

- **P1**: `scripts/harness/main.ts` の init 完了メッセージに guidance skill 案内ブロック (`Need help?` セクション) を追加。`skillSet !== "core"` 条件分岐で core モード時は表示しない。
- **P2**: `phasegate-config-doctor/SKILL.md` に Step 1.5 を新設。fresh init scaffold 期 (default config + 設計文書空 + Unit 構造未着手 の AND 条件) を判定し、9 観点フル診断ではなく `/product-architect` 起動を案内するショートカット応答を実装。
- **P4**: `phasegate-config-doctor/SKILL.md` Step 4 を `AskUserQuestion` ベースに書き換え。提案件数で 1 回確認 / WARN→SUGGEST 分割の使い分け方針を明記。
- **P5**: 両 skill 本文から WI-086 / WI-087 言及を削除。「`agentIntegration.stopHook.enforce` オプションは WI-087 Phase C-2 で追加された」→「(v0.122 以降)」、「WI-087 Phase B の自動検出」→「monorepo 自動検出 (v0.120 以降)」、「memory `feedback_dogfood_before_release.md` 適用」等の internal note 系も全て削除。
- **Cohesion audit (toolkit-guide)**: 設計原則を肯定形 4 項目に正規化、回答プロセスを 4 step に統合 (旧「回答時のスタイル」セクションを Step 4 に吸収)、境界条件を 1 セクション (`## 境界条件`) にまとめ (旧「マッピングが曖昧な場合」「設定変更を伴う質問」)、アンチパターン section を削除 (設計原則の裏返しで重複していた)。
- **Cohesion audit (config-doctor)**: 設計原則を 6 項目の肯定形に正規化、観点 1 と観点 3 を「観点 1: architecture セクション」に統合 (architecture key 不在検査 + preset 推測 + custom 値検証を一体化)、Step 3 末尾の「適用しますか？」列挙を Step 4 に統合、Step 4 末尾の「出力例 (簡易)」section を削除 (Step 3 と重複)、観点 3 paths の OK 判定を Read tool による存在確認ベースに具体化 (X1 矛盾解消)。
- **検証**: `quick_validate.py` で両 SKILL.md が `Skill is valid!`、3499 tests グリーン、L1 lint No violations found。
- **互換性**: SKILL.md 内容変更のみで挙動変更なし、既存テスト影響なし。consumer プロジェクトには `phasegate init` 再実行で新 SKILL.md が deploy される (skill-deployer のロジック自体は無変更)。

**WI-089 全体スコープ**: dogfood feedback の 5 項目中、P1 / P2 / P4 / P5 + cohesion audit を v0.125.0 で完了。**P3 (canonical doc 日本語化)** は別 WI (WI-090 候補) で扱う方針 (本 WI スコープ外)。
