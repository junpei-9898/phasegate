# モデルルーティング規約

## 原則

**Opus = 決める、Sonnet = 広げる、Codex = 作る。**

| 役割 | モデル | 得意領域 |
|------|--------|---------|
| Architect | Opus 4.6 | 発明・判断・骨格設計・品質レビュー |
| Expander | Sonnet 4.6 | 展開・量産・構造化・列挙 |
| Implementor | Codex GPT-5.4 | TDD実装・repo整合・コード生成 |

---

## モデル割り当て表

### 骨格設計（Opus 4.6 — メインセッション内実行）

| Skill | AIDLC Step | 理由 |
|-------|-----------|------|
| `product-architect` | 0 | プロダクト全体像の発明・制約統合 |
| `domain-designer` | 2.1 | 集約境界・不変条件の発明 |
| `logical-designer` | 2.2 | 横断設計の骨格判断 |
| `uiux-designer` | 7 | 体験設計・導線の発明 |
| `kimunii-perspective` | Any | 多角的な品質判断 |
| `skill-creator` | Tooling | スキル設計・構造化 |

### 展開・量産（Sonnet 4.6 — 委任実行 → Opusレビュー）

| Skill | AIDLC Step | 理由 |
|-------|-----------|------|
| `story-writer` | 1.1 | US一覧の粒度統一・量産 |
| `unit-designer` | 1.2 | Unit-USマッピング表の量産 |
| `story-mapper` | 1.5 | MVP整理・優先順位表化 |
| `mock-designer` | 2 | 画面一覧・状態展開 |
| `environment-designer` | 2.2並行 | 環境構成の列挙・整理 |
| `scenario-test-designer` | 6 | E2Eテストケース列挙 |
| `unit-test-designer` | 8前段 | ユニットテストケース列挙 |
| `it-test-designer` | 8前段 | ITテストケース列挙 |
| `unit-test-logic-designer` | 8前段 | テスト疑似コード展開 |
| `it-test-logic-designer` | 8前段 | IT疑似コード展開 |
| `scenario-test-logic-designer` | 8前段 | E2E疑似コード展開 |
| `implementation-planner` | 実装前 | 実装計画の構造化展開 |
| `cascade-updater` | 全工程 | 上位文書への変更波及 |
| `consistency-checker` | 全工程 | 文書間整合チェック |
| `test-coverage-checker` | 6以降 | カバレッジ網羅性検証 |
| `implementation-readiness-checker` | 実装前 | 準備状況チェック |

### 接地・実装（Codex GPT-5.4 — codex-delegator経由）

| Skill | AIDLC Step | 理由 |
|-------|-----------|------|
| `story-implementor` | 2.3-2.7 | TDD実装（コード生成） |
| `codex-delegator` | Any | 並列タスク委任 |

---

## Sonnet委任プロトコル

### 実行フロー

```
┌─────────────────────────────────────────────────┐
│ Phase 1: 計画（Opus in-session）                  │
│  - Skillのプロンプトに従い計画を立案               │
│  - 出力: Sonnetへの委任プロンプト + レビュー観点    │
│  → 人間承認待ち                                    │
├─────────────────────────────────────────────────┤
│ Phase 2: 実行（Sonnet委任）                       │
│  - delegate-sonnet.sh 経由で Sonnet 4.6 に委任     │
│  - Sonnetはファイル読み取り + 文書生成のみ          │
│  - 出力: 設計文書（mdファイル）                     │
├─────────────────────────────────────────────────┤
│ Phase 3: レビュー（Opus in-session）              │
│  - Sonnet出力を品質基準で検証                      │
│  - PASS → 完了                                    │
│  - FAIL → Opusが直接修正                          │
└─────────────────────────────────────────────────┘
```

### Phase 2: Sonnet委任

#### 委任方法

```bash
# scripts/delegate-sonnet.sh を使用
bash scripts/delegate-sonnet.sh \
  --prompt "委任プロンプト" \
  --output "出力ファイルパス" \
  --context "読み込みファイル1,読み込みファイル2"
```

#### Sonnetへの委任プロンプト構造

```
[コンテキスト層] 読むべきファイルパス + 上位設計文書の引用
[タスク層]       作業内容、入力ファイル、出力ファイルパスと期待フォーマット
[制約層]         変更許可ファイル、スコープ制限、フォーマット規約
[禁止層]         判断を含む作業の禁止（判断はOpusが行う）
```

#### Sonnetに委任してよい作業

- 一覧表・マトリクスの作成
- テストケースの列挙
- 既存骨格に沿った章展開
- 用語表・制約表の整理
- 設計文書間のマッピング表作成
- チェックリストの実行

#### Sonnetに委任してはいけない作業

- 集約境界の決定
- アーキテクチャ選択の判断
- 優先順位の最終決定
- トレードオフを伴う設計判断
- レビュー結果に基づく修正方針の決定

### Phase 3: Opusレビュープロトコル

#### レビュー観点（全Sonnet委任共通）

| ID | 観点 | 検証内容 | 重大度 |
|----|------|---------|--------|
| R1 | 上位文書整合 | 上位設計文書（product_overview, domain設計等）との矛盾がないか | BLOCK |
| R2 | 粒度一貫性 | 成果物内で抽象度・粒度が統一されているか | BLOCK |
| R3 | 網羅性 | 入力に含まれる要素が漏れなく展開されているか | BLOCK |
| R4 | 配置ルール | `folder_management_rules.md` に準拠しているか | BLOCK |
| R5 | 判断混入 | Sonnetが独自判断を行っていないか（骨格逸脱） | BLOCK |
| R6 | 表現品質 | 用語・文体がプロジェクト規約と統一されているか | WARN |
| R7 | YAGNI | スコープ外の「改善」「将来への備え」がないか | WARN |

#### 判定ロジック

```
BLOCK に 1つでも FAIL → Opus が直接修正
WARN のみ FAIL         → Opus が直接修正（軽微）
全 PASS                → 完了
```

**重要: Sonnetへの再委任は行わない。** 修正はすべてOpusが直接行う。
理由: 修正は「何が問題か」の判断を含むため、Opus の責務である。

#### レビュー出力フォーマット

```markdown
## Opus Review

### 判定: PASS / FAIL

### 検証結果
| ID | 観点 | 結果 | 備考 |
|----|------|------|------|

### 修正内容（FAILの場合）
- [R1] {ファイル}: {修正内容}
- ...
```

---

## ハイブリッド分業パターン

一部のSkillでは Phase 1（Opus骨格）→ Phase 2（Sonnet展開）の分業が有効。

| Skill | Opusが決めること | Sonnetが広げること |
|-------|-----------------|-------------------|
| `story-writer` | US粒度の判断基準、分割方針 | US一覧の列挙、受け入れ基準の標準化 |
| `logical-designer` | 横断設計の骨格、レイヤー方針 | 章展開、DTO/UseCase一覧、ケース表 |
| `unit-test-designer` | テスト戦略、重点観点 | テストケース一覧、境界値列挙 |

このパターンでは:
1. Phase 1 で Opus が骨格（アウトライン + 判断事項）を出力
2. 人間承認
3. Phase 2 で Sonnet に骨格を渡して展開を委任
4. Phase 3 で Opus がレビュー + 修正
