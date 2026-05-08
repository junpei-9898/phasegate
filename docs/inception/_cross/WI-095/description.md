---
id: WI-095
type: story
severity: normal
status: tested
affects: [validator-system, traceability-model, docs]
github_issue: https://github.com/junpei-9898/phasegate/issues/4
reporter: nakataj-mti
related: [WI-091]
---

# WI-095: drift-detect の `pointers:` block 仕様策定 (設計文書側で element → file path を明示できるようにする)

> 起票日: 2026-05-08
> 起票経緯: WI-091 finding #5 advanced。reporter (nakataj-mti) からの DX 提案。WI-091 v0.127.0 で qualifier normalize による即効改善は完了したが、根本的に「設計文書 heading 名 ↔ code 識別子」の exact match に依存している matching 戦略は脆い。reporter は「(1) 解消後または `pointers:` 機構ドキュメント化後に再開予定」と pending 扱い。

## 背景・症状

WI-091 finding #5 immediate (v0.127.0) で実施した `（〜）` / `(〜)` qualifier normalize は false-positive の主原因を解消した。しかし以下のケースは依然として false-positive を生む:

1. **リネーム途中**: 設計文書 `## CommonIdInfo` ↔ code `CommonIdInfoV2` で乖離報告
2. **表記揺れ**: 設計 `## OrderAggregate` ↔ code `Order_Aggregate` (kebab/snake/camel mix)
3. **同名異物**: 異なる Unit に同名 class が複数存在し、どの code element が対応するか曖昧
4. **暗黙的な対応関係**: design に書いた element が code で別ファイル名で実装されている (例: `## UserProfile` → `pkg/domain/src/user-profile.ts` に実装) — file path matching が必要

reporter からの提案: 設計文書側に `pointers:` block を書いて `element → file path` を明示できる仕様にする。

## 仕様案 (ADR で確定)

### syntax 候補 A: HTML comment 形式
```markdown
## CommonIdInfo

<!-- pointers: pkg/domain/src/entity/common-id-info/index.ts -->

ID 情報を表すエンティティ。
```

### syntax 候補 B: custom block 形式
```markdown
## CommonIdInfo

<pointers>
  - pkg/domain/src/entity/common-id-info/index.ts
  - pkg/domain/src/entity/common-id-info/types.ts
</pointers>
```

### syntax 候補 C: heading frontmatter / fenced metadata
```markdown
## CommonIdInfo
```yaml
pointers:
  - pkg/domain/src/entity/common-id-info/index.ts
```

drift-detect は heading 名 exact match に加えて pointers の file path 存在チェックで matching を補強。

## 実装方針

### Phase 0: ADR 起票 (本 WI 完了の前提)

- ADR-XXX: 「drift-detect の `pointers:` block 仕様」
- 議論ポイント:
  1. **syntax**: HTML comment vs custom block vs heading frontmatter (heading 単位 vs file 単位)
  2. **matching strategy**: exact-match 優先 + pointers fallback、または pointers 優先
  3. **複数 pointer の OR / AND セマンティクス** (どれか 1 つ存在で OK か、すべて存在必須か)
  4. **backward compatibility**: pointers なしの設計文書は従来挙動 (heading exact match)
  5. **parser 改修範囲**: `MarkdownDesignDocumentAdapter` への lex 拡張、HTML comment / fenced block の扱い

### Phase 1: parser 実装
- `markdown-design-document-adapter.ts` の `extractConceptNames(markdown: string): string[]` を `extractConcepts(markdown: string): {name: string, pointers?: string[]}[]` に拡張
- `DesignDocumentPort` の interface 変更 (要 API 契約変更承認)
- 既存テスト互換性: pointers なしの場合 `pointers === undefined` で従来挙動

### Phase 2: drift detection 改修
- `drift-detection-service.ts:42-90` で pointers を考慮した matching ロジック追加
- pointers 指定がある concept は file path 存在を確認、なければ heading 名 exact match (既存挙動)
- 複数 pointer は ADR 確定後の semantic に従う

### Phase 3: ドキュメント
- `docs/guide/drift-detect.md` (新規 or 拡張) で pointers spec を記載
- 既存 user 向け migration: pointers なしは従来挙動なので migration 不要

### Phase 4: dogfood 検証
- 実プロジェクト (本 phasegate repo + reporter の SUGI-ACCOUNT) で pointers を一部 element に追加し、drift detection が pointer を尊重することを確認
- リネーム途中ケース / 表記揺れケース / 暗黙対応ケースの代表 3 シナリオで検証

## カテゴリ判定
- 種別: 新機能追加 (新仕様、新 syntax)
- API 契約変更: `DesignDocumentPort.getElements()` のシグネチャ変更必要 (or 新メソッド追加)
- 新ドメインモデル: 不要 (concept の attribute 拡張のみ)
- レイヤー構造変更なし
- type: story (新機能)、severity: normal (immediate fix で false-positive の主原因は解消済、緊急度低)
- **story-implementor 案件** (API 契約変更 + 新仕様策定)

## 受け入れ基準
- [x] ADR-018 起票・承認 (syntax / matching strategy / 互換戦略を確定)
- [x] `markdown-design-document-adapter.ts` parser に pointers block 抽出ロジック追加
- [x] `DesignDocumentPort` interface に pointers 情報が含まれる (optional `getElementPointers()`)
- [x] `drift-detection-service.ts` matching が pointers を考慮する
- [x] pointers なし設計文書は従来挙動 (heading exact match) を維持 (回帰防止)
- [x] `docs/guide/layer-model.md` で pointers spec 記載
- [x] 結合テスト: pointers 指定 / 未指定 / file 存在 / 不存在 / 複数 pointer の各ケース
- [x] dogfood: unit/integration tests で実 pointer path と code file path の照合を確認

## スコープ外
- WI-091 finding #5 immediate (qualifier normalize) — v0.127.0 で完了済
- WI-091 finding #2 (severity 集計 / WI-094) / #4 (paths threading / WI-093) — 別 WI
- traceability の他 element matching (例: ADR ↔ code) への pointers 拡張 — 別 WI
- `@unit` / `@layer` JSDoc を全 domain ファイルに付与する代替案 — reporter は「monorepo の既存ファイル群には heavy」として却下、本 WI では検討しない

## 関連
- WI-091 description.md finding #5 セクション (advanced 部分)
- GitHub Issue [#4](https://github.com/junpei-9898/phasegate/issues/4)
- `scripts/harness/validator-system/infrastructure/adapters/markdown-design-document-adapter.ts:33-58` (parser 拡張対象、qualifier normalize は v0.127.0 で完了済)
- `scripts/harness/validator-system/domain/services/l4/drift-detection-service.ts:42-90` (matching 改修対象)
- `scripts/harness/validator-system/domain/ports/design-document-port.ts` (interface 変更対象)

## 教訓フィードバック (memory 適用)
- `feedback_dogfood_before_release.md`: 本 WI は API 契約変更を伴うため、ADR 確定後の実装で composition root の DI 配線確認 (createValidatorSystemModule の resolvedConfig 経路) を必ず実施。WI-092 完了後に着手するとリスク低減。
