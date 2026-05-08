---
name: phasegate-toolkit-guide
description: phasegate ツールキット自体に関する Q&A スキル。ユーザーが phasegate の概念 (L0-L4 レイヤーモデル / 防御プリセット / アーキプリセット / Quick Mode と Full Mode / Hook 仕様 / config 全般) について質問したとき、対応する canonical doc を読み込んでから回答する。使用タイミング:「phasegate の L1 と L2 の違いは？」「Quick Mode で許可されるカテゴリを増やしたい」「architecture.preset の使い分けは？」「phasegate の hook って何が動いている？」「phasegate.config.json の relaxedGates は何のため？」など phasegate ツールキット内部の仕様・設定を尋ねる質問。
---

# Phasegate Toolkit Guide

phasegate ツールキット自体の概念・仕様・設定について、ユーザーの質問に正確に答えるための skill。

## このスキルが解決する問題

ユーザーが phasegate を導入したプロジェクトで AI に phasegate 関連の質問をしたとき、AI が `node_modules/phasegate/` を grep で調査して仕様を推測する非効率を防ぐ。

phasegate の概念・仕様は **canonical doc が `node_modules/phasegate/docs/guide/` 配下に同梱されている**。本 skill はそれらへの正確なポインタを提供する。

## 設計原則

1. **canonical doc を必ず Read してから答える** — training data 依存で答えない (バージョン乖離リスク)
2. **knowledge を skill 本体に固定しない** — skill markdown には「どの doc を読めば答えられるか」のポインタだけを書く。`npm update phasegate` で knowledge が自動追従する構造を保つ
3. **read-only に徹する** — 「config の X を変更したい」など設定変更を伴う質問は範囲外。`phasegate-config-doctor` に委譲する
4. **doc 全文をユーザーに貼り付けない** — 要約 + 該当セクション名引用で返す

## 回答プロセス

1. ユーザー質問を以下の **概念カテゴリ** にマッピング
2. 対応する canonical doc を **Read tool で読む** — 長い doc は当該セクションを `offset` / `limit` で限定して読む
3. Read した内容に基づいて簡潔に回答 (2-3 段落 + コード例 1 つ程度)
4. 回答内に **doc 内の該当セクション名** を引用 (ユーザーが doc を直接開いたとき navigation できるように)

### canonical doc の場所

phasegate がインストールされたプロジェクトでは、以下のいずれかにある:

```
node_modules/phasegate/docs/guide/   # npm 経由でインストールされた consumer プロジェクト
docs/guide/                          # phasegate リポジトリ自体 (dogfood)
```

**先に `node_modules/phasegate/docs/guide/` を試し**、見つからなければ `docs/guide/` を試す。

## 概念カテゴリと参照先 doc

### 1. L0-L4 レイヤーモデル

ユーザー質問例:
- 「phasegate の L1 と L2 の違いって何？」
- 「L0 ってどこで動いてる？」
- 「L3 と L4 の検査内容を教えて」

**参照先**: `docs/guide/layer-model.md`

各層 (L0 / L1 / L2 / L3 / L4) のセクションが見出しで区切られているので、質問された層のセクションのみ `offset` 指定で部分読みすると効率的。

### 2. 防御プリセット / アーキプリセット (重要: 2 系統あり)

ユーザー質問例:
- 「preset って何？」
- 「standard と strict の違いは？」
- 「architecture.preset で onion と clean どっち選ぶべき？」
- 「アーキプリセットを custom にしたいんだけど」

**重要**: phasegate には **「防御プリセット」(`project.preset`) と「アーキプリセット」(`architecture.preset`) の 2 系統** がある。質問が曖昧な場合は **どちらを聞いているか確認** すること:

| 呼称 | 概念 | 設定キー | 値の例 |
|---|---|---|---|
| **防御プリセット** | L3 CI で検査強度を選ぶ | `project.preset` | `minimal` / `standard` / `strict` |
| **アーキプリセット** | L1 の層構造と依存方向を定義 | `architecture.preset` | `clean` / `strict-ddd` / `onion` / `hexagonal` / `layered` / `flat` / `custom` |

**参照先**: `docs/guide/preset-selection.md` (両系統の詳細解説)

### 3. Quick Mode と Full Mode

ユーザー質問例:
- 「Quick Mode と Full Mode の違いは？」
- 「Quick Mode で書き込みが許可されるカテゴリを増やしたい」
- 「relaxedGates って何のため？」
- 「allowedCategories はどこで設定する？」

**参照先**: `docs/guide/quick-vs-full-mode.md` (Mode の概念と切り替え条件)

設定キー (`quickMode.allowedCategories` / `quickMode.relaxedGates` / `quickMode.fullModeRequiredWhen`) の詳細は `docs/guide/configuration.md` の `quickMode` セクション。

### 4. Hook 仕様 (PreToolUse / PostToolUse / Stop / SessionStart / UserPromptSubmit)

ユーザー質問例:
- 「phasegate の hook って何が動いてる？」
- 「PreToolUse で何が走る？」
- 「Stop hook の enforce オプションって何？」
- 「post-tool-use で format / lint が走らない、なぜ？」

**参照先**: `docs/guide/hooks-integration.md`

`Responsibility Separation` セクションに pre / post / Stop の責務分担表があり、Stop hook を strict mode (turn を hard block) にする `agentIntegration.stopHook.enforce` オプションもそこに記載されている。

### 5. config 全般 (`phasegate.config.json`)

ユーザー質問例:
- 「phasegate.config.json の各セクションの意味は？」
- 「baseline.enabled って何？」
- 「protectedFiles って何？」
- 「project.paths にはどうやって書く？」

**参照先**: `docs/guide/configuration.md`

各 top-level セクション (`project` / `layers` / `quickMode` / `phaseDependencies` / `harnesses` / `paths` / `reporting` / `architecture` / `agentIntegration` / `protectedFiles` / `baseline`) ごとに説明あり。

### 6. CLI コマンド一覧

ユーザー質問例:
- 「phasegate のコマンド一覧を教えて」
- 「validate と lint と check-phase の違いは？」
- 「init コマンドは何をする？」

**参照先**: `docs/guide/cli-reference.md`

### 7. インストールと初期設定

ユーザー質問例:
- 「phasegate のインストール方法は？」
- 「monorepo で使うときは？」
- 「既存プロジェクトに後から導入したい」

**参照先**:
- 新規導入: `docs/guide/installation.md`
- 既存プロジェクト導入: `docs/guide/retrofit-adoption.md`

### 8. skill 一覧と使い分け

ユーザー質問例:
- 「phasegate にはどんな skill がある？」
- 「story-implementor と quick-implementor の違いは？」

**参照先**: `docs/guide/skills-overview.md`

### 9. Codex 統合

ユーザー質問例:
- 「codex CLI と組み合わせて使うには？」
- 「codex-delegator って何？」

**参照先**: `docs/guide/codex-integration.md`

## 境界条件

### 質問が複数カテゴリにまたがる場合

最も関連性の高い doc を先に読み、必要なら追加で別 doc を読んで補う。

### マッピングが曖昧な場合

1. `docs/guide/` 配下の doc 一覧 (`ls node_modules/phasegate/docs/guide/`) を取得
2. ファイル名から推測して最も近い doc を読む
3. それでも見つからなければ、ユーザーに **どの観点を知りたいか** を質問で絞り込む

### 設定変更を伴う質問

「config の X を変更したい」など **設定変更を伴う質問** は本 skill のスコープ外。`phasegate-config-doctor` に委譲する (deploy 済の guidance skill。ユーザーに「設定変更には phasegate-config-doctor が推奨」と案内)。
