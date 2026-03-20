---
name: it-test-logic-designer
description: ITテストケース設計を元にVitest実装ロジックを設計 - DB・Repository・UseCase・Controller統合テストの疑似コード付き詳細設計
model: sonnet
review: opus
---

# IT Test Logic Designer

ITテストケース設計（`it_test_design.md`）を元に、Vitest実装ロジックを詳細設計するスキル。テストケース設計フェーズとTDD実装フェーズの間に位置し、Repository/UseCase/Controllerの統合テストの設計を行う。

## 実行タイミング

```
テストケース設計フェーズ
  unit-test-designer → it-test-designer → scenario-test-designer
                          ↓
              test-coverage-checker
                          ↓
  unit-test-logic-designer
         ↓
┌────────────────────────────────────────┐
│  it-test-logic-designer（本スキル）      │ ← ここで実行
└────────────────────────────────────────┘
         ↓
  scenario-test-logic-designer
                          ↓
TDD実装フェーズ
  story-implementor
```

## 前提条件チェック

### 必須インプット（存在しなければ`[Question]`で提供を要求）
- **ITテストケース設計** — `docs/product/construction/{unit}/it_test_design.md`
- **論理設計** — `docs/product/construction/{unit}/logical_design.md`

### 推奨インプット（あれば参照）
- **カバレッジレポート** — `docs/product/construction/{unit}/coverage_report.md`
- **既存ITテスト** — `backend/test/integration/**/*.test.ts`（パターン参考）
- **テスト規約** — `docs/principles/testing_rules.md`
- **ストーリー固有論理設計** — `docs/inception/{unit}/{story_id}/logical_design.md`

---

## ⚠️ 上位レイヤー存在チェック

**このスキルはテストケース設計完了後、TDD実装前に実行します。**

### 依存する上位設計文書

| ファイル | 必須 | チェック方法 |
|---------|------|------------|
| `docs/product/construction/{unit}/it_test_design.md` | ✅ 必須 | ITテストケース設計の存在を確認 |
| `docs/product/construction/{unit}/logical_design.md` | ✅ 必須 | 論理設計の存在を確認 |
| `docs/product/construction/{unit}/coverage_report.md` | 📋 推奨 | カバレッジ検証済みか確認 |

### 上位設計が存在しない場合のアクション

上位設計文書が存在しない場合、**ロジック設計を開始せず**、以下を行う：

1. **状況報告** — ユーザーに不足している設計文書を明示
2. **選択肢提示** — 以下の選択肢を提示
   - 上位設計（it-test-designer）を先に実行する
   - 上位設計をスキップして進める（非推奨）
3. **ユーザー指示待ち** — 独自判断でロジック設計を開始しない

---

## ⚠️ 3フェーズ実行ルール

**このスキルは3フェーズで実行する。**
- **Phase 1（計画）**: Opus がスコープ・方針・不明点を整理し、人間の承認を得る
- **Phase 2（実行）**: Sonnet 4.6 に委任して成果物を生成する（`scripts/delegate-sonnet.sh` 経由）
- **Phase 3（レビュー）**: Opus が成果物を検証し、問題があれば直接修正する

**Phase 1/2/3を同時に実行してはならない。モデルルーティングの詳細は `docs/principles/model-routing.md` を参照。**

---

## Phase 1: 計画（plan）

### 目的
ロジック設計のスコープ・テストファイル構成・DB/モック戦略を整理し、人間の承認を得る。

### 出力ファイル
`docs/inception/{unit}/it_test_logic_plan.md`

### 計画ファイルの構成

```markdown
# ITテストロジック設計計画: {Unit名}

## 1. スコープ
- 対象テストケース設計: it_test_design.md
- テストケース総数: X件

## 2. テストファイル構成（計画）

| テストファイル | 対象コンポーネント | ケース数 |
|--------------|------------------|---------|
| `{usecase}.test.ts` | {UseCase名} | X |
| `{repository}.test.ts` | {Repository名} | X |
| `{controller}.test.ts` | {Controller名} | X |

## 3. DB/モック戦略
- テストDB: ローカルSupabase使用
- トランザクション制御: テスト毎にクリーンアップ
- モック対象: 外部API（例: ○○）

## 4. シードデータ設計
| データセット | 用途 | テーブル |
|------------|------|---------|

## 5. QA（不明点・確認事項）

### [Question] Q1: {質問タイトル}
{質問の詳細と背景}
**推奨案:** {AIの推奨案}

[Answer]
（人間が回答を記入）

## 6. 前提条件・リスク
- ...
```

### Phase 1 完了条件
- 計画ファイルを出力した
- 不明点がある場合は`[Question]`セクションに記載した
- **人間にボールを渡した**
- **ロジック設計文書はまだ作成していない**

---

## Phase 2: 実行（execution）

### 開始条件
- 人間がPhase 1の計画を承認した
- QAセクションの全[Question]に[Answer]が記入されている（QAがある場合）

### ワークフロー

1. **テストファイル構成の決定** — ファイル配置と命名規約
2. **Repositoryテストの疑似コード設計** — CRUD操作・トランザクション
3. **UseCaseテストの疑似コード設計** — ビジネスロジック統合
4. **Controllerテストの疑似コード設計** — API認証・バリデーション
5. **シードデータ・ヘルパーの設計** — テストデータ生成

### Phase 2 最低出力基準（Sonnet委任時の品質制約）

以下の基準を満たさない出力は不完全とみなし、Phase 3レビューでBLOCKとする。

| 基準 | 最低要件 |
|------|---------|
| ケース網羅 | it_test_design.mdの全テストケースに対応する疑似コードがあること |
| AAAパターン | 全テストケースがArrange/Act/Assertの3セクションを持つこと |
| シードデータ | テストに必要なシードデータの定義（insert/cleanup）が設計されていること |
| モック戦略 | Repository実DB/外部APIモックの使い分けが明記されていること |
| クリーンアップ | テスト間のデータ独立性を保つクリーンアップ戦略が設計されていること |
| テスト実行コマンド | テスト実行方法が記載されていること |

### 出力ファイル

| 種別 | 配置先 |
|------|--------|
| 成果物 | `docs/product/construction/{unit}/it_test_logic.md` |

### it_test_logic.md の構成

```markdown
# ITテストロジック設計: {Unit名}

## 1. テストファイル構成

| ファイルパス | 対象コンポーネント | ケース数 |
|------------|------------------|---------|
| `backend/test/integration/{context}/{usecase}.test.ts` | {UseCase名} | X |
| `backend/test/integration/{context}/{repository}.test.ts` | {Repository名} | X |
| `backend/test/integration/{context}/{controller}.test.ts` | {Controller名} | X |

## 2. テストヘルパー・シードデータ

### テストヘルパーのインポート

```typescript
import { target, context } from '../../helpers/common-helper.js';
import { getTestClient, cleanupTestData } from '../../helpers/supabase-test-helper.js';
```

### シードデータ設計

```typescript
// backend/test/seeds/{context}/{seed-name}.ts

export const {SEED_NAME}_SEED = {
  // テストデータ定義
  organizations: [
    { id: 'org-001', name: 'テスト組織' },
  ],
  users: [
    { id: 'user-001', organizationId: 'org-001', name: 'テストユーザー' },
  ],
};

export async function seed{SeedName}(client: SupabaseClient): Promise<void> {
  // INSERT処理
}

export async function cleanup{SeedName}(client: SupabaseClient): Promise<void> {
  // DELETE処理
}
```

## 3. Repositoryテスト詳細ロジック

### {Repository名} テスト

#### ファイル: `{repository}.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { target, context } from '../../helpers/common-helper.js';
import { getTestClient, cleanupTestData } from '../../helpers/supabase-test-helper.js';
import { {Repository} } from '../../../src/{context}/infrastructure/repositories/{repository}.js';

target('{Repository}', () => {
  let repository: {Repository};
  const idsToCleanup: string[] = [];

  beforeAll(() => {
    repository = new {Repository}(getTestClient());
  });

  afterEach(async () => {
    for (const id of idsToCleanup) {
      await cleanupTestData(id);
    }
    idsToCleanup.length = 0;
  });

  // IT-REPO-{Name}-001: 保存テスト
  describe('save', () => {
    context('新規エンティティを保存する場合', () => {
      it('DBに永続化される', async () => {
        // Arrange
        const entity = create{Entity}({
          // テストデータ
        });
        idsToCleanup.push(entity.id);

        // Act
        await repository.save(entity);

        // Assert — DBから直接確認
        const client = getTestClient();
        const { data: row } = await client
          .from('{table_name}')
          .select('*')
          .eq('id', entity.id)
          .single();

        expect(row).not.toBeNull();
        expect(row!.{column}).toBe({expectedValue});
      });
    });
  });

  // IT-REPO-{Name}-002: 取得テスト
  describe('findById', () => {
    context('存在するIDで取得する場合', () => {
      it('エンティティが再構築される', async () => {
        // Arrange
        const entity = create{Entity}({ /* ... */ });
        await repository.save(entity);
        idsToCleanup.push(entity.id);

        // Act
        const actual = await repository.findById(entity.id);

        // Assert
        expect(actual).not.toBeNull();
        expect(actual!.id).toBe(entity.id);
        expect(actual!.{property}).toBe({expectedValue});
      });
    });

    context('存在しないIDで取得する場合', () => {
      it('nullが返される', async () => {
        // Act
        const actual = await repository.findById(to{Entity}Id('non-existent-id'));

        // Assert
        expect(actual).toBeNull();
      });
    });
  });

  // IT-REPO-{Name}-003: 更新テスト
  describe('update', () => {
    it('既存エンティティが更新される', async () => {
      // Arrange
      const entity = create{Entity}({ /* 初期値 */ });
      await repository.save(entity);
      idsToCleanup.push(entity.id);

      // Act
      entity.updateXxx({newValue});
      await repository.save(entity);

      // Assert
      const actual = await repository.findById(entity.id);
      expect(actual!.{property}).toBe({newValue});
    });
  });
});
```

## 4. UseCaseテスト詳細ロジック

### {UseCase名} テスト

#### ファイル: `{usecase}.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { target, context } from '../../helpers/common-helper.js';
import { {UseCase} } from '../../../src/{context}/application/usecases/{usecase}.js';
import { {Repository}Port } from '../../../src/{context}/application/ports/{repository}-port.js';

target('{UseCase}', () => {
  let useCase: {UseCase};
  let mockRepository: {Repository}Port;

  beforeEach(() => {
    // モックRepository作成
    mockRepository = {
      save: vi.fn(),
      findById: vi.fn(),
      // ...
    };
    useCase = new {UseCase}(mockRepository);
  });

  // IT-UC-{Name}-001: 正常系
  describe('execute', () => {
    context('有効な入力の場合', () => {
      it('処理が成功し結果が返される', async () => {
        // Arrange
        const input = {
          // UseCaseへの入力
        };
        mockRepository.findById.mockResolvedValue(create{Entity}({}));

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.isSuccess()).toBe(true);
        expect(actual.value.{property}).toBe({expectedValue});
        expect(mockRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({ /* 期待されるエンティティ */ })
        );
      });
    });

    // IT-UC-{Name}-002: 異常系（バリデーションエラー）
    context('無効な入力の場合', () => {
      it('バリデーションエラーが返される', async () => {
        // Arrange
        const invalidInput = {
          // 無効な入力
        };

        // Act
        const actual = await useCase.execute(invalidInput);

        // Assert
        expect(actual.isFailure()).toBe(true);
        expect(actual.error.code).toBe('{ERROR_CODE}');
      });
    });

    // IT-UC-{Name}-003: 異常系（リソース不存在）
    context('対象リソースが存在しない場合', () => {
      it('NotFoundエラーが返される', async () => {
        // Arrange
        mockRepository.findById.mockResolvedValue(null);
        const input = { id: 'non-existent-id' };

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.isFailure()).toBe(true);
        expect(actual.error.code).toBe('NOT_FOUND');
      });
    });
  });
});
```

## 5. Controllerテスト詳細ロジック

### {Controller名} テスト

#### ファイル: `{controller}.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { target, context } from '../../helpers/common-helper.js';
import { {Controller} } from '../../../src/{context}/interfaces/controllers/{controller}.js';
import { createMockCallableContext } from '../../helpers/firebase-test-helper.js';

target('{Controller}', () => {
  let controller: {Controller};
  let mockUseCase: {UseCase};

  beforeEach(() => {
    mockUseCase = {
      execute: vi.fn(),
    };
    controller = new {Controller}(mockUseCase);
  });

  // IT-API-{Name}-001: 認証テスト
  describe('認証', () => {
    context('未認証ユーザーの場合', () => {
      it('UNAUTHENTICATEDエラーが返される', async () => {
        // Arrange
        const ctx = createMockCallableContext({ auth: null });
        const data = { /* リクエストデータ */ };

        // Act & Assert
        await expect(controller.handle(data, ctx))
          .rejects.toThrow('UNAUTHENTICATED');
      });
    });
  });

  // IT-API-{Name}-002: 認可テスト
  describe('認可', () => {
    context('権限のないユーザーの場合', () => {
      it('PERMISSION_DENIEDエラーが返される', async () => {
        // Arrange
        const ctx = createMockCallableContext({
          auth: { uid: 'user-001', role: 'VIEWER' },
        });
        const data = { /* リクエストデータ */ };

        // Act & Assert
        await expect(controller.handle(data, ctx))
          .rejects.toThrow('PERMISSION_DENIED');
      });
    });
  });

  // IT-API-{Name}-003: バリデーションテスト
  describe('バリデーション', () => {
    context('必須フィールドが欠落している場合', () => {
      it('INVALID_ARGUMENTエラーが返される', async () => {
        // Arrange
        const ctx = createMockCallableContext({
          auth: { uid: 'user-001', role: 'ADMIN' },
        });
        const data = { /* 不完全なデータ */ };

        // Act & Assert
        await expect(controller.handle(data, ctx))
          .rejects.toThrow('INVALID_ARGUMENT');
      });
    });
  });

  // IT-API-{Name}-004: 正常系
  describe('正常系', () => {
    it('UseCaseが実行され結果が返される', async () => {
      // Arrange
      const ctx = createMockCallableContext({
        auth: { uid: 'user-001', role: 'ADMIN' },
      });
      const data = { /* 有効なリクエストデータ */ };
      mockUseCase.execute.mockResolvedValue(
        Result.ok({ /* UseCase結果 */ })
      );

      // Act
      const actual = await controller.handle(data, ctx);

      // Assert
      expect(mockUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ /* 期待される入力 */ })
      );
      expect(actual).toEqual({ /* 期待されるレスポンス */ });
    });
  });
});
```

## 6. トランザクション・クリーンアップ戦略

### クリーンアップパターン

```typescript
// テスト毎にクリーンアップ
afterEach(async () => {
  for (const id of idsToCleanup) {
    await cleanupTestData(id);
  }
  idsToCleanup.length = 0;
});
```

### トランザクション分離

```typescript
// トランザクション内でテスト実行（ロールバック）
describe('トランザクションテスト', () => {
  it('エラー時にロールバックされる', async () => {
    // Arrange
    const client = getTestClient();

    // Act
    try {
      await client.rpc('test_transaction', { /* ... */ });
    } catch (e) {
      // Expected error
    }

    // Assert — ロールバックされていることを確認
    const { data } = await client.from('{table}').select('*');
    expect(data).toHaveLength(0);
  });
});
```

## 7. テスト実行コマンド

```bash
# 全ITテスト実行
pnpm --filter backend test:integration

# 特定ファイルのみ
pnpm --filter backend test:integration -- {repository}.test.ts

# watchモード
pnpm --filter backend test:integration -- --watch
```
```

---

## 設計原則

### 1. AAA パターンの徹底
- **Arrange**: テストデータ・モック・シードのセットアップ
- **Act**: テスト対象の実行
- **Assert**: 結果の検証（DB状態確認含む）

### 2. DB直接確認パターン
```typescript
// Assert — DBから直接確認
const client = getTestClient();
const { data: row } = await client
  .from('{table}')
  .select('*')
  .eq('id', entity.id)
  .single();
expect(row).not.toBeNull();
```

### 3. モック戦略
- **Repository**: 実DB使用（統合テストの本質）
- **外部API**: モック使用（vi.mock）
- **UseCase**: Repositoryをモック化（単体的な統合テスト）

### 4. 既存パターンの踏襲
- `target()` と `context()` ヘルパーを使用
- `getTestClient()` と `cleanupTestData()` を使用
- ファイル配置は既存の構造に合わせる

---

---

## Phase 3: レビュー（Opus review）

### 実行主体
メインセッション（Opus 4.6）が実行する。Sonnetへの再委任は行わない。

### レビュー手順
1. Sonnetが出力したファイルを読み込む
2. `docs/principles/model-routing.md` のレビュー観点 R1〜R7 に沿って検証する
3. **スキル固有レビュー観点**を検証する
4. 判定結果を出力する

### スキル固有レビュー観点（BLOCK基準）
- [ ] it_test_design.mdの全テストケースIDに対応する疑似コードが存在するか
- [ ] Repository テストで実DBへの直接確認（Assert段階）が設計されているか
- [ ] シードデータのinsert/cleanup関数が具体的に設計されているか
- [ ] テスト間のデータ独立性が担保されているか（共有状態がないか）
- [ ] target()/context()ヘルパーの使用が既存パターンと一致しているか

### 判定と修正
- **BLOCK項目にFAIL** → Opusが直接修正してから完了とする
- **WARNのみFAIL** → Opusが直接修正してから完了とする
- **全PASS** → 完了

## 注意事項

- **テストコードは生成しない**（設計文書のみ）— 実装は `story-implementor` スキル（codex-delegator経由、またはメインセッションで直接実行）が行う
- 疑似コードは実装の指針となる詳細レベルで記載する
- TDDの「RED」フェーズで正しく失敗するテストを設計する
- 既存のテストパターン（`backend/test/integration/**/*.test.ts`）を参照してスタイルを統一する
- シードデータはテスト間で独立させ、相互干渉を防ぐ

---

## 次ステップへの誘導

ITテストロジック設計完了後、以下のスキルに進んでください：

1. **シナリオテストロジック設計** — E2Eテストのテストロジック
   - `scenario-test-logic-designer`

2. **TDD実装** — 全テストロジック設計完了後
   - `story-implementor`
