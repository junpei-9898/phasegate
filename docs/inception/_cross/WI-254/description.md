---
id: WI-254
type: story
severity: normal
status: reflected
affects: [ci-governance, harness-api, agent-integration]
---

# WI-254: 指示ファイルの整合性 pin（ADR-030 §Decision.3.① の実装）

> 起票日: 2026-07-10
> 経緯: ADR-030「プロンプトインジェクション脅威モデルと信頼のルート宣言」が承認され、その 5 コンポーネントの ① として本 WI を起票。エージェントへの指示を搭載するファイル群（SKILL.md / hook 定義 / husky / agent-context テンプレート等）が、インジェクションで逸脱したエージェント（＝洗浄を試みる悪意ある内部者）に改竄される経路を、SHA-256 pin + 再計算照合で塞ぐ。

## 背景・問題

ADR-030 は「指示を搭載するファイルの改竄」を既存脅威モデル（洗浄を試みるエージェント）に還元し、対策を「秘密に依存しない再計算（ハッシュ）を、攻撃者が制御できない場所（CI）で行う」方式に統一すると宣言した（§Decision.2）。本 WI はその第一実装として、指示ファイル群の SHA-256 を manifest に pin し、

- **session-start hook**（fast-path）で起動時に照合し drift を警告する、
- **CLI `integrity:pin`** で意図的な変更を正規に記録する、
- **CI**（信頼のルート／authoritative）で再計算して照合する、

の 3 経路を用意する。ローカル照合は fast-path（正直なエージェントの事故防止・騙されかけたエージェントの早期停止）であり、最終判定は CI の再計算に委ねる（ADR-030 §Decision.1）。

## 設計判断

### 配置 unit: ci-governance（防御統制の unit）

整合性照合は「防御構成そのものの statically な統制」であり、既存の baseline（`CreateBaselineUseCase`）や CI テンプレート生成と同じ ci-governance に属する。domain に純ロジック（対象列挙 + digest 照合）、infrastructure に fs 読み取り + `node:crypto` sha256 adapter、composition-root で配線する（CA 依存方向 `domain → application → infrastructure/presentation` 厳守）。

### manifest スキーマ（v1 固定）

リポジトリルート `phasegate.integrity.json`:

```json
{ "version": 1, "algorithm": "sha256", "files": { "<relative path>": "<hex digest>" } }
```

- `files` はパス昇順でソート済み・決定的に書き出す。
- 対象 v1（固定）: `skills/*/SKILL.md`、`.claude/settings.json`、`.claude/scripts/*.sh`、`.husky/*`（ファイルのみ）、`docs/templates/agent-context/**`。
- baseline（sha1・配列形式）とは別ファイル・別スキーマ。baseline は「実装ファイルのドリフト検出」、integrity は「指示ファイルの改竄検出」で目的が異なるため統合しない。

### CLI: `integrity:pin` / `integrity:verify`

- `integrity:pin` — 対象を再計算して manifest を書き出す（意図的な変更の記録手段）。`--dry-run` で書き込まず内容のみ表示。
- `integrity:verify` — 再計算して照合。drift（不一致 / manifest に無い追加ファイル / manifest にあるが実在しないファイル / manifest 欠落）があれば一覧を出し **exit 2**。drift なしは exit 0。
- 両コマンドを WI-250 canonical 定数 `KNOWN_HARNESS_COMMANDS`（harness-api domain）にも追加する。追加しないと conformance テストが乖離を検出して fail する（＝正しいゲート挙動）。

### session-start hook: warn-only / fail-open

session-start hook に integrity verify を in-process で呼び、drift 時のみ警告ブロックを additionalContext へ前置する。**ブロックしない（warn-only）**。verify 自体が例外を投げた場合は「integrity 検証不能」警告に fail-open する（ADR-030 の fast-path 位置づけ: ローカル照合は信頼のルートではないため、hook を止めない）。**未導入 = 沈黙**: drift が `manifest-absent` のみ（= integrity pin 未導入プロジェクト）の場合は警告を出さない。manifest 欠落を drift（exit 2）として扱うのは明示実行の CLI `integrity:verify` のみ。

### CI 組み込み: workflow yml に 1 step 追加（採用）

L3 validator 登録は validator-system の広範な改修を要し、かつ本 WI と並行して別エージェントが validator-system を編集中のため干渉を避ける。`.github/workflows/ci.yml` の test job に `integrity:verify` 実行 step を 1 行追加するのが最小コスト。これが ADR-030 §Decision.1 の「CI が再計算して照合する（authoritative）」を満たす。

## Acceptance Criteria

- AC-1: `phasegate.integrity.json`（version:1 / algorithm:"sha256" / files は昇順ソート）が `integrity:pin` で決定的に生成される。
- AC-2: `integrity:verify` が drift なしで exit 0、drift（不一致・追加・欠落・manifest 欠落）で exit 2 と一覧を返す。
- AC-3: 対象列挙が仕様どおり（SKILL.md / .claude/settings.json / .claude/scripts/*.sh / .husky ファイル / agent-context テンプレート）で決定的・ソート済み。
- AC-4: `integrity:pin` / `integrity:verify` が `KNOWN_HARNESS_COMMANDS` に登録され、conformance テストが green。
- AC-5: session-start hook が drift なし時・`manifest-absent` のみ（未導入）時に警告を出さず、manifest 存在下の drift（mismatch/added/missing）時に警告を additionalContext へ前置する（warn-only・fail-open）。
- AC-6: CI（`.github/workflows/ci.yml`）が `integrity:verify` を実行する。

## 関連文書

- ADR-030（プロンプトインジェクション脅威モデルと信頼のルート宣言）§Decision.3.①
- WI-250（CLI コマンドリストの canonical 化）— `KNOWN_HARNESS_COMMANDS` 同期の前提
