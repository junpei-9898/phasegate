---
id: WI-034
type: refactor
severity: trivial
status: drafted
affects: [validator-system, docs]
---

# WI-034: L0 legacy validator (`L0-001` / `L0-002`) の撤去

> 起票日: 2026-04-25
> 親 audit: WI-030

## 背景

`validator-system/domain/value-objects/validator-id.ts` には以下の legacy definition が残存:

```ts
'L0-001': 'fuse-hook-config',
'L0-002': 'fuse-mount-status',
```

これらは初期設計期に「FUSE フック」を OS レベルで実現する構想があった名残で:

1. `phasegate.config.json` で `layers.L0.enabled: false` (デフォルト) として無効化されている
2. 実装本体（FUSE mount のチェックロジック等）は存在しない（validator definition のみが残っている）
3. WI-029 で確認済: 真の L0 検知は `agent-integration` unit の 5 種 runtime hook + Husky の 2 種 git hook が担当

放置すると:

- `list-errors --layer L0` に表示されて user が誤解する
- 新規 contributor が「FUSE 何か実装が必要なのか?」と無駄に時間を使う
- `--layer L0` 実行が PASS で返ってきて「L0 は何かを check した」と誤認する

## 本 WI でやること

### Phase 1: code 削除

1. `validator-id.ts` から `L0-001` / `L0-002` を削除
2. `composition-root.ts` 内の L0 validator 登録ロジックを削除
3. `RunL0ValidatorsUseCase` を削除（または「agent-integration の hook を呼ぶ wrapper」として再定義）
4. `phasegate.config.json` schema から `layers.L0` を削除（層 ID 自体は廃止）
5. preset JSON から L0 設定を削除

### Phase 2: 影響範囲の整合

1. `--layer L0` CLI が「L0 は agent-integration unit 配下の runtime hook で実現される」エラー or info メッセージを返すようにする（または `--layer` の有効値から L0 を削除）
2. `list-errors --layer L0` を空にするか、agent-integration hook の説明にリダイレクト

### Phase 3: docs 整合

1. layer-model.md / README から「`L0-001` / `L0-002` は legacy」記述を削除（撤去済になるため不要）
2. CLAUDE.md の `validate --layer L0` 行を削除
3. CHANGELOG に breaking change として記録（`--layer L0` 廃止）

## 受け入れ基準

- [ ] `validator-id.ts` から `L0-001` / `L0-002` が削除される
- [ ] `list-errors --layer L0` がもう legacy validator を表示しない
- [ ] `--layer L0` CLI 引数が廃止されるか、agent-integration hook info を返すようになる
- [ ] config schema / preset JSON から L0 関連が削除される
- [ ] docs から legacy validator への言及が消える
- [ ] CHANGELOG に migration guide（`--layer L0` を使っていた CI ジョブの移行方法）が記載される

## 後方互換の検討

- `--layer L0` を完全削除すると既存 CI が break する可能性 → **deprecation 期間**を 2〜3 minor バージョン設けて warning 表示してから削除する案
- もしくは `--layer L0` 受理時に「これは agent-integration の hook で実現されています」を出してから exit 0

## スコープ外

- agent-integration unit を「L0」と公式にリラベルする作業（既に layer-model.md で説明済み）
- L4 disabled-by-default 状態の見直し（別観点で WI-033 か別 WI）

## 関連

- `scripts/harness/validator-system/domain/value-objects/validator-id.ts:23-24`
- `scripts/harness/validator-system/composition-root.ts:48,77`
- `phasegate.config.json:layers.L0`
- `scripts/harness/config-foundation/infrastructure/presets/*.json`
