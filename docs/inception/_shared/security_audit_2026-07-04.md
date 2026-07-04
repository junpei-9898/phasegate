# Phasegate 監査メモ (2026-07-04)

> コンセプト評価・バグ洗い出し・配布版再現確認の記録。
> 実施: 3系統の並列監査（コンセプト整合性 / harness コア / hooks・インストーラ）+ テスト全実行。
> テスト結果: **505 ファイル / 3885 件 全 pass**（＝下記の穴は既存テストで検知できていない）。
> **配布版 0.160.21 (npm) で主要4件を実行レベルで再現確認済み**（本文末尾）。

---

## 0. 総括

コンセプト（「設計してから書け」を hooks/git/CI で機械的に強制し、AI が自己修正できる形でエラーを返す）は強く独自性がある。
一方で **「看板の防御が実装で成立していない」構造的欠陥が多数**。最も致命的なのは:

> フェーズゲートという中核保証が **Claude Code 環境では Bash 経由の書き込みに一切発火しない**。
> さらに本リポジトリ自身に `.claude/` が存在せず、開発本体は L0 agent hook 抜きで運用されている。

ビジョン（①エンジニア不在でも品質判断がハーネスで成立 → ②全知的生産がゲートを通り、詳細を知らずとも結果が信用に足る）の土台（＝ゲートが本当に閉じていること）がまだ保証されていない。

---

## 1. コンセプト評価

### 強み（守るべき核）
- **フェーズゲートの物理性** — 設計文書が存在するまで write を実行前に止める。「人がレビューで防ぐ」を「ツールが実行前に止める」に置換。
- **自己修正可能なエラー** — ブロック時に次に打つべきスキル名を構造化して返す → AI の復帰を自動化できる。
- **テスト品質のセマンティック検査** — AAA 構造・assertion 強度まで検査し「仕様の写経テスト」を弾く思想。
- **マルチエージェント指向** — `.claude` / `.codex` / git hook の composability。

### 構造的な弱点・矛盾
1. **「AI 非依存」の粒度が曖昧** — 「品質ルールが agent 非依存」は真だが「全機能が agent 非依存」は偽。スキル起動は Claude/Codex 固有、Cursor/Copilot は git hook fallback のみ。
2. **L0 の正体が二重** — agent hook（実行前ブロック）と git hook（commit 時）の独立 2 系統。層モデル図では統合されて見え、片方だけ導入すると穴になる。
3. **ドキュメント不整合** — スキル数が CLAUDE.md「28」、実物/README「30」。層モデル文書が L0 の 2 系統を統一説明していない。
4. **証跡が「存在ベース・事後的」** — ゲート通過証明が `@work-item-id` の存在チェック止まり。設計とコードの論理一致・誰がいつ承認したかは記録されない。

---

## 2. ビジョンへのギャップと汎用化アイデア

### ゴール①「エンジニア判断の代替」に足りないもの
現状のゲートは**順序と存在**は保証するが、**意図の妥当性**（なぜこの仕様か / このドメインモデルは要求を満たすか / このテストは本当に検証しているか）は判定できない。
- **要件↔設計↔テスト↔コードの semantic triple グラフ**（現状は file-level の flat traceability 止まり）。
- **name-equivalence 検出**（`Customer` と `User` の同義語ドメイン概念ズレを name-based 一致では拾えない）。ubiquitous language レジストリの正本化。
- **意図(rationale)の記録位置の正本化** — ADR/WI とのリンクを optional から必須へ。

### ゴール②「全知的生産への汎用化」の障害
- **言語ロックイン** — L1 が全面 TypeScript/Biome AST 専用。「バリデータ = 入力→HarnessError[] を返すプラグイン」の言語中立 IF に再定義し Biome を一実装に格下げ。
- **WI 型が実装フロー特化** — `story/issue/fix/chore/refactor` のみ。調査・意思決定・運用・レビューを表現不可。WI を「フェーズ列を持つ抽象ワークフロー」に一般化し AIDLC をプリセット化。
- **証明可能性の実体化（②の核心）** — 各ゲート通過時に「入力ハッシュ + 実行バリデータ集合 + 結果 + timestamp + 実行者」を署名付き attestation として発行し commit/artifact に紐付ける（in-toto / SLSA provenance 的発想）。これで「詳細を知らずとも結果を信用できる」が技術的に裏付く。
- **一方向フロー** — inception→product→code の単方向で、コードから学ぶ逆流（design smell 検出・パターン学習）が弱い。

**最重要の前提**: 上記の前に、現状の fail-open を fail-closed に統一しないと、どんな証跡も「素通りした緑」を証明してしまう。

---

## 3. バグ一覧（実コードで確認）

### 🔴 最重大 — フェーズゲート回避（中核保証の無効化）
| # | 内容 |
|---|------|
| **P-1** | **Claude Code で Bash 書き込みがゲート対象外**。`templates/.claude/settings.json` の PreToolUse は `Bash`→`deny-check.sh` のみ、`phasegate hook pre-tool-use` は `Write\|Edit` にしか配線されていない。`cat > scripts/harness/x/domain/evil.ts <<EOF` で設計文書なしに回避可。**Codex の `hooks.json` は `Bash`→`phasegate hook pre-tool-use` を配線しており、BashWriteTargetExtractor は Codex 専用に動き Claude では死んでいる**。さらに本リポジトリに `.claude/` 自体が無く開発本体は L0 agent hook 抜き。CLAUDE.md の明示的保証に反する |
| **P-2** | **`..` トラバーサル回避**。`write-target-scope.ts` の `normalize` が `..` を解決せず、`.../__tests__/../domain/evil.ts` が `/__tests__/` 判定で保護対象外(`null`)になる |
| **P-3** | **大文字小文字違いで回避**（macOS 等大小非依存 FS）。`matchPrefix` が完全一致比較のみで `Scripts/harness/...` が対象外 |
| **P-4** | BashWriteTargetExtractor が `>\|`・`dd of=`・`bash -c '...'`・`install`・`rsync` 等を検出できず Codex 経路で回避 |
| **P-5** | `.phasegate/baseline.json` が保護対象外・.gitignore 未登録・ハッシュ照合なし。path 追記で grandfather 扱いで素通り |

### 🔴 重大 — 品質ゲートの fail-open（例外時に「合格」を返す）
config 破損やモジュール障害で防御が静かに開く。6箇所以上:
- `phase-gate-query-adapter.ts` — 例外時 `create(true)`（通過）
- `phase-dependency-phase-gate-policy-adapter.ts` — `catch { satisfied:true }`
- `nyquist-ac-coverage-policy-adapter.ts` — 全例外を `passed:true`
- `phase-dependency-model-query-adapter.ts` — `catch { return [] }` → 無条件合格
- skill-quality の L1/L2 adapter — validator 障害を「合格」に化けさせて commit

### 🔴 重大 — バリデータが構造的に発火しない／誤検出
- **Quick Mode の維持レイヤーが全滅** — config `maintainedLayers: ["L1","L2"]` を `isMaintained` が `includes("L2-002")` で照合するため常に false → **L2 全6件 + L3 全4件が全 skip**。CLAUDE.md「quick-implementor でも L1/L2 維持」が破綻
- **L3-003 カバレッジが本番配線で絶対 fail 不能** — `coverageReportPort` 未配線・use case が入力を無視。閾値 90% は飾り
- **L4-003 dead-code が誤検出 1592 件** — `.js` 拡張子 import（本 PJ 規約）を解決できずほぼ全 export を未使用扱い
- **L4-002 / WI-217 反映チェック** — Unit 名をパスとして `readFile`→ENOENT→無検査 PASS、標準レイアウトで永久スキップ
- **セキュリティスキャナ** — allowlist マーカー1個でファイル全体スキップ、本物のシークレットも検査外
- **`ci-check --quick`** — validator 未配線で何も実行しない
- **NEW_DOMAIN 拒否が発火不能** — `changeKind:'MODIFY'` ハードコードで domain/ 新規作成が quick モードをすり抜け

### 🟠 config スキーマ vs コードの不一致（CLI 文鎮化リスク）
- **`storyReflection.mappings`** — スキーマは `{unitId, artifacts}` 要求、コード/ドキュメントは `{inception, product, required}` 期待。ドキュメント通り書くと AJV 拒否で全コマンド `exit 2`（doctor/uninstall 含む）
- **`config:plan --intent l4-strict --apply`** — 存在しないキーを書き `additionalProperties:false` が拒否 → 以後全コマンド起動不能

### 🟠 その他（中〜高、抜粋）
- Nyquist 系: レガシー StoryId エイリアス解決が全面不動作 / `HF2-01` 形式が正規表現漏れ / MatrixValidationService が no-op
- `deny-check.sh`: コマンド連結で回避可 / stdin 全文を `/tmp` に world-readable ログ出力 / `jq` 不在で fail-open / `sed 's/\*/.*/'` が最初の1個のみ変換
- Windows パス区切りで Work-Item 反映スキャン全滅
- `scaffold-wi` 採番が Windows で常に WI-001 上書き・3桁固定で WI-1000 以降破綻
- `import-graph` の substring フォールバック過剰マッチでレイヤー違反見逃し
- `work-items --apply` が `completed` を `tested` に降格
- nyquist domain 層が application 層を import（依存方向逆転）
- personal install が既存 `.git/hooks/pre-commit` を無警告スキップ / JSON マージ重複判定が `JSON.stringify` キー順依存で冪等性崩れ

---

## 4. 配布版 0.160.21 (npm) 再現確認

`npm pack phasegate@0.160.21` を展開し、配布物のソースを直接実行して確認。

| 項目 | 結果 |
|------|------|
| **P-1** | ✅ 再現。`templates/.claude/settings.json` の Bash matcher は `deny-check.sh` のみ。対照的に `templates/.codex/hooks.json` は Bash→`phasegate hook pre-tool-use` を配線 |
| **P-2** | ✅ 再現。`fromPath("scripts/harness/agent-integration/__tests__/../domain/evil.ts")` → **`null`（未保護）** |
| **P-3** | ✅ 再現。`fromPath("Scripts/harness/order/domain/evil.ts")` → **`null`（未保護）**。正常系 `scripts/harness/order/domain/order.ts` は Level 3 |
| **Quick Mode 維持レイヤー全滅** | ✅ 再現。`maintainedLayers:["L1","L2"]` で `ValidatorRelaxationService.build` の結果が L2 maintained=`[]`（全 skip）、L3 maintained=`[]`（全 skip） |

配布版のこれらのソースはローカル 0.160.22 と同一。**現在ユーザーに配布されているパッケージで全て成立している。**

---

## 5. 推奨着手順
1. **P-1〜P-3 のゲート穴を塞ぐ**（最優先）。P-1 はテンプレート1行追加 + 本リポジトリへの `.claude/` 導入。`normalize` に `..` 解決、FS 大小非依存判定を追加。
2. **fail-open を fail-closed に統一**（②の証跡の前提）。
3. **発火しないバリデータの配線修復**（L3-003・Quick Mode 維持レイヤー・L4-002/003）。
4. **ドキュメント同期**（CLAUDE.md スキル数、L0 の 2 系統説明、storyReflection スキーマ）。
5. 修正時は「穴を突く回帰テスト」（`__tests__/../`、大小違い、Bash 経由書き込み、config 破損時の fail-closed）を同時追加。
