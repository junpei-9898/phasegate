---
id: WI-106
type: issue
severity: normal
status: tested
affects: [traceability-model, validator-system, ci-governance]
source: internal
---

# WI-106: inception 全体での WI ID 重複防止

> 起票日: 2026-05-09
> 起票経緯: `_cross/WI-031` と `agent-integration/WI-031` が同時に存在し、別内容の work item が同一 ID を持っていたため。

## 背景

`WI-XXX` は Unit 配下と `_cross` 配下のどちらにも作成できるが、現状では `docs/inception/**` 全体での global unique が十分に強制されていない。

今回、以下の重複が発見された:

- `docs/inception/_cross/WI-031/`: CI template 統一 + `phasegate init --with-ci`
- `docs/inception/agent-integration/WI-031/`: `legacy_id: H11-04` の Stop Hook Adapter

暫定対応として agent-integration 側は `WI-097` に再採番済み。ただし、同じ重複が今後再発しないよう、ルール明文化と機械検証が必要。

## 想定原因

1. 旧 H-ID から `WI-XXX` へ移行する採番と、新規 `_cross` WI の採番が別々に動いた。
2. `docs/inception/{unit}/WI-XXX` と `docs/inception/_cross/WI-XXX` を横断して `id` の一意性を検証する validator がない、または実行経路に組み込まれていない。
3. 新規 WI 作成時の運用ルールに「inception 全体で global unique」が明示されていない。

## 本 WI でやること

### Phase 1: ルール明文化

1. `docs/folder_management_rules.md` に、`WI-XXX` は `docs/inception/**` 全体で一意であることを明記する。
2. `AGENTS.md` に、新規 WI 作成時は既存 `id: WI-XXX` と `WI-XXX` ディレクトリを確認する最小ルールを追記する。

### Phase 2: 機械検証

1. `docs/inception/**/description.md` の frontmatter `id` を全走査し、重複を検出する。
2. description の parent directory 名 `WI-XXX` と frontmatter `id` が一致しない場合に検出する。
3. `_cross` と Unit 配下を区別せず、同一 `id` は 1 件のみ許可する。
4. 既存の L2 metadata / traceability 系 validator のどちらへ置くのが自然か判断し、既存 validator flow に組み込む。

### Phase 3: 採番器の再発防止

1. `migrate work-items` の既存 WI 番号収集で `_cross` を含む `docs/inception/**/WI-XXX` を参照する。
2. 新規 WI 番号を提案・生成する処理がある場合、同じ global unique ルールを使う。

## 受け入れ基準

- [x] `docs/folder_management_rules.md` に WI ID global unique ルールが明記されている
- [x] `AGENTS.md` に新規 WI 起票時の重複確認ルールが最小限で追記されている
- [x] `docs/inception/**/description.md` の frontmatter `id` 重複を検出する自動テストがある
- [x] directory 名 `WI-XXX` と frontmatter `id` の不一致を検出する自動テストがある
- [x] `_cross` と Unit 配下をまたいだ重複 fixture が fail する
- [x] `migrate work-items` の採番が `_cross` を含む既存 WI を避ける
- [x] `pnpm harness:check-ready` または該当 validator コマンドで再発防止が確認できる

## 完了確認

- `traceability-model` に `WorkItemIdentityValidationService` と `FileSystemWorkItemIdentityGateway` を追加し、`docs/inception/**/WI-XXX/description.md` の frontmatter `id` を global scan する。
- `validate-metadata docs/inception/_cross/WI-106/description.md --json` で現行 repository が pass することを確認。
- `_cross` と Unit 配下をまたぐ同一 `id` fixture、および parent directory 名と frontmatter `id` の不一致 fixture を自動テスト化。
- `migrate work-items` の既存 WI ID 収集が `_cross` と Unit 配下をまたぐ番号を予約することを自動テスト化。

## スコープ外

- 既存の全 legacy `@story-id` を `@work-item-id` に一括置換すること
- `WI-097` の追加実装
- GitHub issue への自動同期

## 関連

- `_cross/WI-031`: CI template 統一 + `phasegate init --with-ci`
- `agent-integration/WI-097`: 旧 `agent-integration/WI-031` / `legacy_id: H11-04` の再採番先
