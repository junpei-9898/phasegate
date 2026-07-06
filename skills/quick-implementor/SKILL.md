---
name: quick-implementor
description: Quick Mode下でのad-hoc実装スキル。story-implementorの緩和版。バグ修正・ドキュメント修正・テスト追加・設定変更など軽微な変更に使用。L1全維持、L2はphase-gate緩和、L3はsecurityのみ、L4スキップ。使用タイミング: 「Quick Modeで修正して」「バグ修正して」「テスト追加して」「設定変更して」「ドキュメント修正して」など、フルハーネスが過剰な軽微変更時。除外: 新機能追加、API契約変更、新ドメインモデル追加にはstory-implementorを使用すること。
languages: [typescript]
---

# Quick Implementor

## 目的

Quick Mode下での軽微変更実装スキル。story-implementorの緩和版として、フルハーネスが過剰な変更に対して最低限の品質を維持しつつ高速に実装を行う。

## 適用条件チェック（必須）

### 入力（適用可能な変更カテゴリ）

| カテゴリ | 例 |
|---------|---|
| `bugfix` | 既存コードのバグ修正、エラーハンドリング追加 |
| `docs` | ドキュメント修正、コメント修正 |
| `test` | テスト追加・修正（新機能のテストではない） |
| `config` | 設定変更、依存バージョン更新 |

### WI-aware trivial path（ISSUE-026 Phase D）

作業対象に `WI-XXX` が明示されている場合、最初に `docs/inception/{unit}/WI-XXX/description.md` または `docs/inception/_cross/WI-XXX/description.md` のfrontmatterを確認する。

| WI type | Quick Modeでの扱い |
|---------|-------------------|
| `fix` | 適用候補。既存仕様の局所修正として扱う |
| `chore` | 適用候補。依存更新・運用・ドキュメント整備として扱う |
| `story` | 適用不可。`story-implementor` にエスカレーション |
| `issue` | 適用不可。product反映が必要な可能性が高いため `story-implementor` にエスカレーション |
| `refactor` | 適用不可。設計影響を伴う可能性が高いため `story-implementor` にエスカレーション |

`type: fix | chore` でも、API契約変更・新ドメインモデル追加・レイヤー構造変更・複数Unitにまたがる実装変更が見えた場合は、通常の除外ルールを優先して `story-implementor` に切り替える。

### 前提条件（適用除外・フルハーネス必須 → story-implementor を使用）

- 新機能追加
- API契約変更（Port/Adapter インターフェース変更）
- 新ドメインモデル追加（Entity/VO/Aggregate）
- レイヤー構造の変更

**除外対象を検出した場合**: 即座にユーザーに報告し、story-implementor への切り替えを提案する。

---

## Quick Mode 品質ゲート

| レイヤー | 通常モード | Quick Mode |
|---------|----------|-----------|
| L1 Biome AST | 全8ルール | **全8ルール維持** |
| L2 Pre-commit | phase-gate + metadata + test-quality | **metadata + test-quality 維持、phase-gate 緩和** |
| L3 CI | security + performance + coverage + nyquist | **security のみ** |
| L4 Scheduled | drift-detect + consistency + dead-code | **スキップ** |

---

## 実行フロー

### Step 1: 適用条件の判定

変更内容を分析し、Quick Mode 適用可能か判定する。

```
変更カテゴリ判定:
1. 変更対象ファイルを特定
2. 変更内容が bugfix/docs/test/config のいずれかに該当するか確認
3. 該当しない場合 → story-implementor へエスカレーション
```

### Step 2: 影響範囲の確認

- 変更対象ファイルの `@unit` / `@layer` を確認
- 変更が単一Unit内に収まるか確認（複数Unit横断の場合は story-implementor を推奨）

### Step 3: 実装

1. **修正コードの実装** — 最小限の変更で問題を解決する
2. **テストの確認/追加** — 修正に対応するテストが存在するか確認、なければ追加
3. **L1チェック（メタデータ付与）** —
   - **既存ファイル編集時**: `@unit` / `@layer` コメントを勝手に削除しない（意図せぬ欠落は L1-001 / L1-002 違反）
   - **新規テストファイル作成時**: 先頭に必ず以下 3 行を付与する
     ```typescript
     // @unit <被テストコードと同じ Unit ID>
     // @layer <被テストコードと同じ layer>
     // @story <HXX-XX 形式のストーリーID>
     ```
     `@story` は `docs/inception/{unit}/{story_id}/` の `story_id` を使用。複数カバー時は `// @story H09-01, H09-02` のように列挙。
   - **新規の非テストソースファイル作成**: Quick Mode のスコープ外 — `story-implementor` にエスカレーションする（quick-implementor は既存コードの修正と新規テスト追加が主スコープ）
4. **L2チェック** — metadata 整合性、テスト品質（AAA, actual変数, 日本語テスト名）を確認

### Step 4: 検証

```bash
pnpm test  # 全テスト グリーンを確認
```

### 出力（Step 5: コミット）

Atomic commit で変更をコミットする。コミットメッセージに `[quick]` プレフィックスを付与。作業対象WIがある場合は `Work-Item: WI-XXX` trailer を必ず含める。

```
[quick] fix: {変更内容の要約}

Work-Item: WI-XXX
```

---

## story-implementor との差分

| 項目 | story-implementor | quick-implementor |
|------|------------------|-------------------|
| 前提条件チェック | implementation-readiness-checker 必須 | 不要 |
| Phase Gate | 必須（上位設計文書の存在チェック） | **緩和**（設計文書なしでも可） |
| TDD ピラミッド | Unit → IT → E2E の順序厳守 | **修正+テスト確認のみ** |
| 2-Phase Execution | Phase 1(計画) → Phase 2(実装) | **単一フェーズ**（計画不要） |
| テスト設計 | テスト設計文書の事前作成必須 | **不要** |
| カバレッジ | 90%以上必須 | **既存カバレッジの維持のみ** |
| 教訓フィードバック | cascade-updater 起動提案 | **任意** |

---

## 注意事項

- Quick Mode であっても **L1 全ルール** と **L2 metadata/test-quality** は維持される
- 変更が当初の想定より大きくなった場合、途中で story-implementor に切り替える判断を行う
- `@unit` / `@layer` コメントの欠落は Quick Mode でも許容されない
- ファイル配置は `docs/folder_management_rules.md` に従う
