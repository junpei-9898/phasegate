# Retrofit Adoption Guide

既に動いているプロジェクトに phasegate を後付け導入するためのチュートリアル。

## このガイドの対象

- 既存コードベースに phasegate を導入したいメンテナ
- 設計文書（logical_design.md / domain_model.md 等）が未整備のまま保守と新規開発を並行したい状態
- 「phase-gate が既存コード編集で発火して保守が詰む」ことを避けたい

phasegate は本来「新規プロジェクトをゼロから AIDLC で組む」前提で設計されている。
既存コードに後付けすると、設計文書の無いファイルを触るたびに pre-tool-use hook が発火し、
通常の保守作業が block される。このガイドは ISSUE-007 で導入した **baseline grandfather** と
**scaffold-design CLI** を組み合わせて、段階的に phasegate 管理下に取り込む手順を示す。

---

## 前提

- Node.js >= 18.0.0
- 既存プロジェクトのソースコードが git で管理されている
- phasegate >= v0.71.0（`baseline.enabled` default=true / dry-run 出力キー整合済み）

```bash
npm install --save-dev phasegate
```

---

## 4 ステップ後付け導入

```
Step 1: npx phasegate init           # 雛形・スキル配布
Step 2: npx phasegate baseline       # 既存コードを grandfather 登録
Step 3: 既存ファイルの保守は gate をスキップ
Step 4: 新規 Unit / 構造変更は scaffold-design で設計文書を起こしてから実装
```

---

## Step 1: 初期化

```bash
npx phasegate init --name <project-name>
```

- `.claude/skills/` に 28 スキルを配置
- `phasegate.config.json` を生成
- `phasegate.config.json` に `baseline` セクションが未記載でも、v0.71.0 以降は
  **`baseline.enabled` の default が `true`** のため grandfather は既定で有効

grandfather をオフにしたい場合のみ `phasegate.config.json` に明示:

```json
{
  "baseline": {
    "enabled": false,
    "path": ".phasegate/baseline.json"
  }
}
```

`path` も省略時は `.phasegate/baseline.json` が使われる。retrofit 用途では
この既定値のまま触らないのが最短。

---

## Step 2: 既存コードを baseline に登録

```bash
npx phasegate baseline
```

実行すると、デフォルト glob (`scripts/**/*.ts` / `src/**/*.{ts,tsx,js,jsx}` /
`docs/product/construction/**/*.md` / `docs/inception/**/*.md`) にマッチする
ファイルの相対パスと sha1 ハッシュを `.phasegate/baseline.json` に保存する
（`**/__tests__/**` / `*.test.ts` / `*.spec.ts` / `node_modules/**` / `dist/**`
は既定で除外）。

```jsonc
{
  "version": "1.0",
  "createdAt": "2026-04-22T10:00:00.000Z",
  "algorithm": "sha1",
  "files": [
    { "path": "src/foo.ts", "sha1": "abc123..." },
    { "path": "src/bar.ts", "sha1": "def456..." }
  ]
}
```

### 確認だけしたい場合

```bash
npx phasegate baseline --dry-run --json
```

出力 (抜粋):

```json
{
  "savedPath": "/path/to/.phasegate/baseline.json",
  "entryCount": 12,
  "dryRun": true,
  "overwriteBlocked": false,
  "files": [
    { "path": "src/foo.ts", "sha1": "abc123..." }
  ]
}
```

v0.71.0 で CLI 出力の key は保存ファイルと同じ `files` に統一された（以前の
`entries` は deprecated）。

### 再生成（`.phasegate/baseline.json` を上書き）

`baseline` は既存スナップショットがあると既定で上書きを拒否する（exit 2）:

```bash
npx phasegate baseline --force   # 明示的に上書き
```

### 特定 glob だけ登録

```bash
npx phasegate baseline --paths "src/**/*.ts,scripts/**/*.ts"
```

### `.phasegate/baseline.json` は commit する

grandfather 対象はチーム全員で共有するため、`.phasegate/baseline.json` は
`.gitignore` に入れず commit する。

---

## Step 3: 既存ファイルの保守

baseline に登録されたファイルは pre-tool-use hook で gate をスキップする。

- ファイル内容を編集しても sha1 が一致していれば許可（タイポ修正・コメント追加等）
- 構造的変更（新規 export 追加・レイヤー変更等）で sha1 がズレた瞬間、grandfather
  が外れて通常の gate 対象に戻る。その時は Step 4 に進む

この段階では `logical_design.md` 等の設計文書が存在しなくても、既存ファイルの
保守は通常通り行える。

---

## Step 4: 新規 Unit / 構造変更は scaffold-design

新しい Unit を作る、あるいは baseline を外して既存 Unit を phasegate 管理下に
取り込む場合、設計文書を先に起こす。

### 4-1: phase-gate 発火時のエラーを読む

設計文書が存在しない Unit に新規ファイルを作ろうとすると、pre-tool-use hook が
以下の形式で block する（v0.67.0 以降）:

```
成果物が不足しています: docs/product/construction/harness-api/logical_design.md
→ phase gate prerequisites are not met

次のアクション: /story-implementor スキルを使用して設計フェーズから開始してください。
  scaffold: npx phasegate scaffold-design --unit harness-api --phase logical
  テンプレ: templates/logical_design.template.md
```

- **次のアクション**: `suggestedSkill` — 本格的に設計するなら Claude Code でこのスキルを呼ぶ
- **scaffold**: `scaffoldCommand` — テンプレだけ先に生成して placeholder で埋めたい時はこちら
- **テンプレ**: `templatePath` — 手書きしたい場合の参照元

### 4-2: scaffold-design で雛形を生成

```bash
npx phasegate scaffold-design --unit harness-api --phase logical
```

出力例:

```
設計文書を生成しました: docs/product/construction/harness-api/logical_design.md
テンプレ: /path/to/project/templates/logical_design.template.md
Unit: harness-api / phase: logical
TODO プレースホルダを実体で埋めてください。
```

生成されるファイルは `{{unit}}` が Unit ID に置換済みで、`TODO:` コメントが
各セクションに残る。人間 / AI エージェントがこの TODO を埋めて設計を実体化する。

### 対応する phase

| `--phase` | 生成先 |
|---|---|
| `logical` | `docs/product/construction/{unit}/logical_design.md` |
| `domain` | `docs/product/construction/{unit}/domain_model.md` |
| `uiux` | `docs/product/construction/{unit}/uiux_design.md` |
| `unit-test` | `docs/product/construction/{unit}/unit_test_design.md` |
| `it-test` | `docs/product/construction/{unit}/it_test_design.md` |

### 4-3: 既存ファイルがある場合

既定では scaffold は既存ファイルを上書きしない:

```
既に存在します: docs/product/construction/harness-api/logical_design.md
上書きするには --force を指定してください。
```

意図的に再生成したい場合のみ `--force` を付ける:

```bash
npx phasegate scaffold-design --unit harness-api --phase logical --force
```

### 4-4: JSON 出力（CI / スクリプト向け）

```bash
npx phasegate scaffold-design --unit harness-api --phase logical --json
```

exit code:

| 状況 | code |
|---|---|
| 生成成功 / 上書き成功 | 0 |
| 既存ファイルあり（--force なし） | 2 |
| 引数不正 / テンプレ不在 | 2 |

---

## baseline から外して phasegate 管理下に取り込む

Unit の設計文書が揃い、phasegate フル管理に昇格させたい場合の手順:

1. `scaffold-design` で logical_design.md / domain_model.md を生成 → TODO を埋める
2. 対象ファイルを `.phasegate/baseline.json` から削除（手動編集 or `--paths` で対象外にして再生成）
3. 以降、構造変更のたびに phase-gate が走る通常の運用に移行

---

## よくある詰まり方

### Q. `baseline` 作成後も gate が発火する

**確認**:
- v0.71.0 未満を使っていないか（v0.70.0 以前は `baseline.enabled` の default が
  `false` で、`phasegate.config.json` に明示指定が必要だった）
- `phasegate.config.json` で `baseline.enabled: false` を**明示**していないか
- `baseline.path` と実ファイルの配置が一致しているか
- 発火したファイルが baseline に登録されているか（`.phasegate/baseline.json` で
  確認）。default glob から外れたパスは未登録の可能性が高い

### Q. scaffold した直後に L1 lint が失敗する

scaffold は markdown テンプレのみ生成する。**TS/JS ソースファイルは生成しない**。
ソースコードの雛形が必要な場合は `/story-implementor` スキルを使う。

### Q. チームメイトの環境で baseline がズレる

`.phasegate/baseline.json` は commit する必要がある。`.gitignore` に
入れていないか確認。

### Q. 既存ファイルを少し触っただけで grandfather が外れた

sha1 一致で判定しているため、**フォーマット変更・インポート順序変更でも外れる**。
意図的な編集であればそのまま設計文書を起こすフローに移る。自動フォーマッタが
大量変更を起こす場合は、`baseline` を `--force` で取り直す運用も可。

---

## 関連

- `docs/guide/cli-reference.md` — `baseline` / `scaffold-design` のフラグ一覧
- `docs/guide/layer-model.md` — L0-L4 防御モデルと phase-gate の位置付け
- `docs/ADR/ADR-013-story-reflection-gate.md` — phase-gate の思想的背景
- ISSUE-007 — 本ガイドが対応する起票 issue（`docs/inception/issues/ISSUE-007/`）
