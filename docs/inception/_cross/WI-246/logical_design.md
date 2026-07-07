# WI-246 論理設計: 反映ゲートの layer-aware 化

## 1. 変更対象

| ファイル | レイヤー | 変更内容 |
|---|---|---|
| `domain/ports/story-reflection-file-system-port.ts` | domain | `storyTouchesUnitLayer(storyId, unitId, layer): Promise<boolean>` を追加 |
| `domain/services/story-reflection-checker.ts` | domain | mapping ループに source-touch ガードを追加 |
| `infrastructure/filesystem/file-system-story-reflection-adapter.ts` | infrastructure | git 履歴ベースの touch 判定実装 + `storyAffectsUnit` の affects 未定義=skip 修正 |

`full-story-reflection-defaults.ts`（preset デフォルト）は変更しない。

## 2. StoryReflectionChecker のガード

`check()` の mapping ループ内、既存の cross-WI × `storyAffectsUnit` ガードの直後に追加:

```
if (resolvedInception.isCrossWorkItem
    && productPath が "domain_model.md" で終わる
    && !(await this.fsPort.storyTouchesUnitLayer(storyId, unitId, "domain"))) {
  continue; // domain 層を触れていない WI に domain_model 反映は要求しない
}
```

- domain_model 判定は mapping の解決済み product パス末尾（`domain_model.md`）で行う（preset 構造を変えないため）。
- `logical_design.md` mapping はガード対象外（無条件要求を維持）。
- unit-local WI（`isCrossWorkItem === false`）はガード対象外。

## 3. Adapter: git 履歴ベースの touch 判定

```
storyTouchesUnitLayer(storyId, unitId, layer):
  paths = WI のコミットが変更したファイルパス集合（storyId ごとにインスタンス内キャッシュ）
  return paths のいずれかが `scripts/harness/{unitId}/{layer}/` で始まる
```

- コミット集合の取得: `git log --format=@@%s --name-only --grep "Work-Item:.*<storyId>"`（`execFile` 使用、shell 経由禁止）。trailer 行の完全一致確認として、対象コミットの trailer に `\bWI-NNN\b` が単語境界で含まれることを検証する（WI-24 が WI-246 に誤マッチしない）。
- git 実行失敗・コミット 0 件 → 空集合 → `false`（touch なし = 要求除去方向のみ）。
- 実装パターンの先行事例: `phase2-extensions/infrastructure/adapters/git-log-document-age-adapter.ts`。
- rootDir を cwd として実行する。

## 4. Adapter: `storyAffectsUnit` の affects 未定義=skip 修正

現行: frontmatter に `affects:` キーが無い → `true`（全 unit に影響）
変更後: `description.md` が読める場合、`affects:` キーが無い / 空リスト → `false`（影響なし）

- `description.md` 自体が読めない場合は現行どおり `true` を維持（affects を検査できない malformed WI はフェールクローズ）。
- frontmatter ブロックが無い場合も `false`（affects 未定義に含める）。
- 現コーパス影響 0 件（WI-242/244/245 のみ該当、いずれも設計文書なしで元々要求は発火しない）。

## 5. テスト設計（TDD — RED 先行）

unit テスト（`scripts/harness/__tests__/unit/phase-dependency-model/story-reflection-checker.test.ts` へ追加、fake port 使用・ドメインのモック禁止規約準拠）:

| # | ケース名（日本語） | Arrange | Assert |
|---|---|---|---|
| T1 | domain層を触れたcross WIはdomain_model反映を引き続き要求する | touch(domain)=true, affects一致, annotation なし | domain_model violation あり（anti-gutting） |
| T2 | infra/appのみのcross WIはlogical_designのみ要求されdomain_modelは要求されない | touch(domain)=false, affects一致, annotation なし | logical_design violation のみ |
| T3 | affectsが空/未定義のcross WIはどのunitにも反映要求を発火しない | storyAffectsUnit=false（affects未定義相当） | violations 0 件 |
| T4 | unit-local WIはtouch判定に関係なくdomain_model反映を要求する | isCross=false, annotation なし | domain_model violation あり |

adapter テスト（`file-system-story-reflection-adapter` のテストへ追加）:

| # | ケース名 | Assert |
|---|---|---|
| T5 | affectsキーが無いdescriptionはstoryAffectsUnitがfalseを返す | false |
| T6 | descriptionが存在しない場合はtrueを維持する | true |

実コーパス回帰（integration、`scripts/harness/__tests__/integration/phase-dependency-model/story-reflection-corpus.it.test.ts` 新規）:

| # | ケース名 | Assert |
|---|---|---|
| T7 | 実コーパスのblocking violationsはhonest baselineを超えない | 変更後の violation (unitId, storyId, productPath) 集合が baseline 集合の部分集合であること（除去のみ・追加 0） |

## 6. blast radius 実測手順

全 unit × 現行 checker / 新 checker で violation 集合を比較し、`added=0`（新規要求 0）を機械的に示す。結果は WI-246 の最終報告に記録する。
