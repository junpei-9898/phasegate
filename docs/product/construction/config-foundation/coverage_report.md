# テストカバレッジレポート: config-foundation

@story-id H04-01
@story-id H04-02
@story-id H04-03
## 1. サマリー
| 観点 | カバー項目数 | 未カバー項目数 | カバレッジ率 |
|------|------------|--------------|------------|
| 受け入れ基準 | 14 | 1 | 93% |
| ドメインロジック | 18 | 1 | 95% |
| UseCase | 4 | 1 | 80% |
| **総合** | **36** | **3** | **92%** |

### 判定結果

条件付き合格。主要要件は概ねテスト設計に反映されているが、以下の3点は実装前に補完したい。

- `project.preset` の値変更だけでPreset切替が完了することを直接検証するケースが不足している
- `L3Config.coverageThreshold` の小数値を許容するかどうかの期待結果が未確定である
- `DisableFeatureUseCase` の設定読込失敗経路が明示的にテスト設計されていない

補足:

- 本Unitの外部公開面はCLIであり、HTTP API/エンドポイント設計は存在しないため、APIカバレッジは評価対象外とした

## 2. 受け入れ基準カバレッジ詳細

Unit定義にはAC IDの明記がないため、既存のStory IDを識別子として使用する。

| AC ID | 基準内容 | 対応テストケース | カバー状態 |
|------|----------|----------------|----------|
| H04-01 | v2スキーマに `project` / `layers` / `quickMode` / `phaseDependencies` / `planningMode` / `paths` / `reporting` / `harnesses` を含む | IT-CF-043, IT-CF-044, IT-CF-077, IT-CF-079 | ○ |
| H04-01 | `layers` セクションでL1-L4の有効/無効・バリデータ構成・閾値を設定できる | UT-CF-055-063, UT-CF-166-176, IT-CF-003, IT-CF-056-057 | ○ |
| H04-01 | `quickMode` セクションで `allowedCategories` / `maintainedLayers` / `relaxedGates` を設定できる | UT-CF-093-103, IT-CF-043, IT-CF-077 | ○ |
| H04-01 | JSONスキーマバリデーションを実行できる | IT-CF-005, IT-CF-011, IT-CF-043-050, IT-CF-079 | ○ |
| H04-01 | 有効・無効なサンプル設定ファイルで検証できる | IT-CF-035-042, IT-CF-077-079 | ○ |
| H04-02 | `minimal` Presetを定義できる | UT-CF-007, UT-CF-166, IT-CF-004, IT-CF-031, IT-CF-056 | ○ |
| H04-02 | `standard` Presetを定義できる | UT-CF-008, UT-CF-167, IT-CF-010 | ○ |
| H04-02 | `strict` Presetを定義できる | UT-CF-009, UT-CF-168, IT-CF-032, IT-CF-057-058 | ○ |
| H04-02 | `project.preset` フィールドの値変更のみでPreset切替が完了する | IT-CF-001-004, UT-CF-172 | △ |
| H04-02 | Presetの個別設定上書きができる | UT-CF-171, UT-CF-175, IT-CF-003 | ○ |
| H04-03 | GSD由来品質機能がデフォルトで `enabled: false` になる | UT-CF-126-140, UT-CF-197, IT-CF-004, IT-CF-031 | ○ |
| H04-03 | `phasegate:enable <feature>` で個別機能を有効化できる | IT-CF-015-018, IT-CF-062 | ○ |
| H04-03 | `phasegate:disable <feature>` で個別機能を無効化できる | IT-CF-023-026, IT-CF-068 | ○ |
| H04-03 | `phasegate:enable --list` で機能一覧を表示できる | IT-CF-030-032, IT-CF-060-061 | ○ |
| H04-03 | 存在しない機能名指定時に利用可能一覧付きエラーを返す | UT-CF-154, UT-CF-187-188, IT-CF-019, IT-CF-063, IT-CF-065, IT-CF-069 | ○ |

## 3. ドメインロジックカバレッジ詳細

### 集約
| 対象 | 主な不変条件・ルール | 対応テストケース | カバー状態 |
|------|------------------|----------------|----------|
| HarnessConfig | INV-2, INV-4, INV-5, INV-6、Feature切替、Layer取得、DTO変換、イベント蓄積/排出 | UT-CF-001-035 | ○ |

### エンティティ

該当なし。`config-foundation` は単一集約 `HarnessConfig` と値オブジェクト群で構成され、独立したEntityは設計されていない。

### 値オブジェクト
| 対象 | 主な不変条件・ルール | 対応テストケース | カバー状態 |
|------|------------------|----------------|----------|
| ProjectConfig | `name` 非空、Preset変更、等値性 | UT-CF-036-043 | ○ |
| Preset | 列挙値制約、識別メソッド、等値性 | UT-CF-044-054 | ○ |
| LayersConfig | 4レイヤー必須、Layer取得、等値性 | UT-CF-055-063 | ○ |
| L1Config | severity列挙制約、ルール取得、等値性 | UT-CF-064-071 | ○ |
| L2Config | validator重複禁止、contains、等値性 | UT-CF-072-078 | ○ |
| L3Config | `0 <= coverageThreshold <= 100`、coverage gate判定 | UT-CF-079-087, UT-CF-190-193, UT-CF-201 | △ |
| L4Config | schedule非空、validator重複禁止、等値性 | UT-CF-088-092 | ○ |
| QuickModeConfig | 各配列の重複禁止、順序保持、allows/maintains | UT-CF-093-103 | ○ |
| PhaseDependenciesConfig | 構造のみ検証、customRules有無判定 | UT-CF-104-110 | ○ |
| CustomPhaseRule | `phase` 非空、`requires` 重複禁止、等値性 | UT-CF-111-116 | ○ |
| PlanningModeConfig | 列挙値制約、phase別解決、等値性 | UT-CF-117-125 | ○ |
| HarnessesConfig | デフォルト無効原則、`bundleSizeLimit` 下限制約、enable/disable/isEnabled | UT-CF-126-140, UT-CF-194-197 | ○ |
| PathsConfig | 空文字禁止、グローバルパス禁止、等値性 | UT-CF-141-147 | ○ |
| ReportingConfig | 空文字禁止、等値性 | UT-CF-148-152 | ○ |
| FeatureName | 利用可能一覧に基づく検証、文字列表現、等値性 | UT-CF-153-158 | ○ |
| FeatureToggle | enabled状態の保持/反転、等値性 | UT-CF-159-165 | ○ |

### ドメインサービス
| 対象 | 主な不変条件・ルール | 対応テストケース | カバー状態 |
|------|------------------|----------------|----------|
| PresetResolutionService | deep merge、配列置換、primitive上書き、Preset定義異常、Feature上書き | UT-CF-166-181 | ○ |
| FeatureRegistry | FeatureName正規化、重複排除、安定ソート、利用可能性検証 | UT-CF-182-189 | ○ |

## 4. UseCaseカバレッジ詳細
| UseCase名 | 正常系 | 異常系 | カバー状態 |
|----------|------|------|----------|
| LoadResolvedConfigUseCase | IT-CF-001-004 | IT-CF-005-008 | ○ |
| ValidateConfigUseCase | IT-CF-009-010 | IT-CF-011-014 | ○ |
| EnableFeatureUseCase | IT-CF-015-018 | IT-CF-019-022 | ○ |
| DisableFeatureUseCase | IT-CF-023-026 | IT-CF-027-029 | △ |
| ListAvailableFeaturesUseCase | IT-CF-030-032 | IT-CF-033-034 | ○ |

`DisableFeatureUseCase` の `△` は、`configRepository.load()` が `ConfigNotFoundError` を返した場合の伝播確認がケースとして独立していないため。

## 5. 未カバー項目一覧

| 観点 | 未カバー項目 | 不足内容 |
|------|------------|---------|
| 受け入れ基準 | `project.preset` の値変更のみでPreset切替が完了すること | 既存ケースは各Presetの解決結果を個別に確認しているが、「他の差分を変えずに `project.preset` だけを切り替える」シナリオを直接検証していない |
| ドメインロジック | `L3Config.coverageThreshold` の小数値境界 | UT-CF-201 の期待結果が未確定で、整数のみ許容するのか、小数も許容するのかがテスト設計として閉じていない |
| UseCase | DisableFeatureUseCase の読込失敗経路 | `ConfigNotFoundError` などの `configRepository.load()` 失敗を明示的に検証する異常系ケースがない |

## 6. 推奨追加ケース

- `project.preset` を `minimal` から `strict` に変更した raw document を用意し、他セクション差分を変えなくても `layers` と `harnesses` が strict 定義へ切り替わることを検証する
- `coverageThreshold = 90.5` の扱いを仕様として先に確定し、その決定に合わせて `L3Config` のユニットテストと AJV スキーマ検証のITを追加する
- `DisableFeatureUseCase` で `configRepository.load()` が `ConfigNotFoundError` を返した場合、例外をそのまま伝播し `save()` が呼ばれないことを確認する

## 7. 次のアクション

1. `L3Config.coverageThreshold` の小数値許容可否を設計判断として確定する
2. `project.preset` 単独切替ケースと `DisableFeatureUseCase` の読込失敗ケースを `unit_test_design.md` / `it_test_design.md` に追記する
3. 追記後に本レポートのサマリー数値を更新し、未カバー項目を解消する
