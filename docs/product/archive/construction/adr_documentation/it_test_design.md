# インテグレーションテスト設計: adr-documentation

> **Unit ID**: adr-documentation
> **作成日**: 2026-03-11
> **対応ストーリー**: US-020, US-021, US-022
> **テストフレームワーク**: Vitest 3.0.0
> **入力**: `domain_model.md`, `logical_design.md`

---

## 1. テスト対象一覧

| # | テスト対象 | レイヤー | テストファイル | テスト種別 | モック |
|---|-----------|---------|-------------|----------|-------|
| 1 | FileSystemAdrRepository | Infrastructure | `file-system-adr-repository.test.ts` | インテグレーション | なし（実ファイルシステム） |
| 2 | ADRライフサイクル統合 | UseCase/Domain/Infrastructure統合 | `adr-lifecycle.test.ts` | インテグレーション | なし（実ファイルシステム） |

### テスト方針

- 実ファイルシステムを使用し、モックは一切使用しない
- テストごとに一時ディレクトリを作成・クリーンアップする
- ドメインオブジェクト、ポート実装、Infrastructure全て実体を使用する
- YamlFrontMatterParser、MarkdownSerializerも実体を使用する

---

## 2. 一時ディレクトリ戦略

### セットアップ・クリーンアップパターン

全インテグレーションテストで以下の共通パターンを使用する。

```typescript
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { beforeEach, afterEach } from 'vitest';

let tempDir: string;

beforeEach(() => {
  // テストごとにユニークな一時ディレクトリを作成
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'adr-it-test-'));
  // ADRディレクトリ構造を作成
  fs.mkdirSync(path.join(tempDir, 'docs', 'ADR'), { recursive: true });
});

afterEach(() => {
  // テスト終了後にクリーンアップ
  fs.rmSync(tempDir, { recursive: true, force: true });
});
```

### ディレクトリ構造

テスト実行時に一時ディレクトリ内に以下の構造が作成される。

```
{tempDir}/
└── docs/
    └── ADR/
        ├── 001-phase-gate-adoption.md    (テストデータ)
        ├── 002-five-layer-defense.md     (テストデータ)
        └── template.md                   (除外対象テストデータ)
```

---

## 3. フィクスチャデータ設計

### 3.1 ADR Markdownフィクスチャ

テスト内で使用するADRファイルのテンプレートデータ。

#### Proposed状態のADR

```markdown
---
title: "Phase Gate Adoption"
status: Proposed
date: "2026-03-11"
---

## Context

フェーズゲートを採用する背景と理由。

## Decision

フェーズゲートモデルを開発プロセスに採用する。

## Consequences

品質ゲートにより各フェーズの成果物品質が保証される。

## Alternatives

スクラムのみの運用を検討したが、ガバナンス要件を満たせない。
```

#### Accepted状態のADR

```markdown
---
title: "Five Layer Defense Model"
status: Accepted
date: "2026-03-01"
---

## Context

多層防御モデルの設計背景。

## Decision

5層防御モデルを採用する。

## Consequences

各層で独立した検証が可能になる。

## Alternatives

3層モデルを検討したが、カバレッジが不十分。
```

#### Superseded状態のADR

```markdown
---
title: "Old Decision"
status: Superseded
date: "2026-02-01"
superseded_by: "docs/ADR/005"
---

## Context

旧い意思決定の背景。

## Decision

旧い技術的判断。

## Consequences

旧い決定の影響。

## Alternatives

旧い代替案。
```

#### template.md（除外対象）

```markdown
---
title: "[ADRタイトルを記入]"
status: Proposed
date: "YYYY-MM-DD"
---

## Context

[意思決定に至った背景・状況を記述]

## Decision

[採択された技術的判断の内容を記述]

## Consequences

[決定による影響・帰結を記述]

## Alternatives

[検討されたが採択されなかった選択肢を記述（任意）]
```

### 3.2 フィクスチャ書き出しヘルパー

```typescript
// __tests__/helpers/fixture-writer.ts

/**
 * ADR Markdownファイルを一時ディレクトリに書き出す
 */
function writeAdrFixture(
  basePath: string,
  id: number,
  title: string,
  status: string,
  options?: {
    date?: string;
    supersededBy?: string;
    context?: string;
    decision?: string;
    consequences?: string;
    alternatives?: string;
  },
): string {
  const displayId = String(id).padStart(3, '0');
  const kebabTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const fileName = `${displayId}-${kebabTitle}.md`;
  const filePath = path.join(basePath, 'docs', 'ADR', fileName);

  const date = options?.date ?? '2026-03-11';
  const context = options?.context ?? 'テスト用コンテキスト';
  const decision = options?.decision ?? 'テスト用決定';
  const consequences = options?.consequences ?? 'テスト用結果';
  const alternatives = options?.alternatives ?? 'テスト用代替案';

  let frontMatter = `---
title: "${title}"
status: ${status}
date: "${date}"`;

  if (options?.supersededBy) {
    frontMatter += `\nsuperseded_by: "${options.supersededBy}"`;
  }

  frontMatter += '\n---';

  const content = `${frontMatter}

## Context

${context}

## Decision

${decision}

## Consequences

${consequences}

## Alternatives

${alternatives}
`;

  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

/**
 * template.mdを一時ディレクトリに書き出す
 */
function writeTemplateFixture(basePath: string): void {
  const filePath = path.join(basePath, 'docs', 'ADR', 'template.md');
  const content = `---
title: "[ADRタイトルを記入]"
status: Proposed
date: "YYYY-MM-DD"
---

## Context

[意思決定に至った背景・状況を記述]

## Decision

[採択された技術的判断の内容を記述]

## Consequences

[決定による影響・帰結を記述]

## Alternatives

[検討されたが採択されなかった選択肢を記述（任意）]
`;
  fs.writeFileSync(filePath, content, 'utf-8');
}
```

---

## 4. FileSystemAdrRepository インテグレーションテスト

**テストファイル**: `src/units/adr-documentation/__tests__/infrastructure/file-system-adr-repository.test.ts`
**モック**: なし（実ファイルシステム + YamlFrontMatterParser実体 + MarkdownSerializer実体）

### セットアップ

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { context, target } from '../../helpers/common-helper';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

let tempDir: string;
let repository: FileSystemAdrRepository;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'adr-repo-test-'));
  fs.mkdirSync(path.join(tempDir, 'docs', 'ADR'), { recursive: true });
  const parser = new YamlFrontMatterParser();
  repository = new FileSystemAdrRepository(tempDir, parser);
});

afterEach(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});
```

### テストケースツリー

```
target('findById', () => {
  describe('IDに一致するADRファイルを読み取る', () => {
    it('存在するADRファイルが正しくパースされてADRとして返されること', ...)
    it('フロントマターのタイトルが正しく読み取られること', ...)
    it('フロントマターのステータスが正しく読み取られること', ...)
    it('本文の各セクションが正しく読み取られること', ...)
    it('Superseded状態のADRのsupersededByが正しく読み取られること', ...)
    context('該当するファイルが存在しない場合', () => {
      it('nullが返されること', ...)
    })
  })
})

target('findAll', () => {
  describe('全ADRファイルを一覧取得する', () => {
    it('全ADRファイルがID昇順で返されること', ...)
    it('template.mdが除外されること', ...)
    it('各ADRのフロントマターと本文が正しくパースされること', ...)
    context('ADRファイルが0件の場合', () => {
      it('空配列が返されること', ...)
    })
    context('template.mdのみが存在する場合', () => {
      it('空配列が返されること', ...)
    })
  })
})

target('save', () => {
  describe('ADRをMarkdownファイルとして書き出す', () => {
    it('フロントマター+本文のMarkdownファイルが正しく書き出されること', ...)
    it('書き出されたファイルが再読み込み可能であること', ...)
    it('既存ファイルが上書き更新されること', ...)
    it('ADRディレクトリが存在しない場合に自動作成されること', ...)
    it('Superseded状態のADRを保存してfindByIdで再取得した場合にsuperseded_byが正しく復元されること', ...)
  })
})

target('nextId', () => {
  describe('次のADR番号を算出する', () => {
    it('既存ADRの最大番号+1が返されること', ...)
    it('欠番がある場合でも最大番号+1が返されること', ...)
    context('ADRファイルが0件の場合', () => {
      it('1が返されること', ...)
    })
    context('template.mdのみが存在する場合', () => {
      it('1が返されること', ...)
    })
  })
})

target('exists', () => {
  describe('指定IDのADRファイル存在確認', () => {
    it('存在するIDの場合trueが返されること', ...)
    it('存在しないIDの場合falseが返されること', ...)
  })
})
```

### 代表的なAAAパターン例

#### findById - 正常系

```typescript
it('存在するADRファイルが正しくパースされてADRとして返されること', async () => {
  // Arrange
  writeAdrFixture(tempDir, 1, 'Phase Gate Adoption', 'Accepted', {
    context: 'フェーズゲートを採用する背景',
    decision: 'フェーズゲートモデルを採用する',
    consequences: '品質ゲートによる品質保証',
    alternatives: 'スクラムのみの運用',
  });
  const id = AdrId.create(1);

  // Act
  const actual = await repository.findById(id);

  // Assert
  expect(actual).not.toBeNull();
  expect(actual!.id.value).toBe(1);
  expect(actual!.getFrontMatter().title).toBe('Phase Gate Adoption');
  expect(actual!.getFrontMatter().status).toBe(AdrStatus.Accepted);
  expect(actual!.getBody().context).toBe('フェーズゲートを採用する背景');
});
```

#### findById - 異常系

```typescript
it('nullが返されること', async () => {
  // Arrange
  const id = AdrId.create(999);

  // Act
  const actual = await repository.findById(id);

  // Assert
  expect(actual).toBeNull();
});
```

#### findAll - 正常系

```typescript
it('全ADRファイルがID昇順で返されること', async () => {
  // Arrange
  writeAdrFixture(tempDir, 3, 'Third ADR', 'Proposed');
  writeAdrFixture(tempDir, 1, 'First ADR', 'Accepted');
  writeAdrFixture(tempDir, 2, 'Second ADR', 'Accepted');

  // Act
  const actual = await repository.findAll();

  // Assert
  expect(actual).toHaveLength(3);
  expect(actual[0].id.value).toBe(1);
  expect(actual[1].id.value).toBe(2);
  expect(actual[2].id.value).toBe(3);
});

it('template.mdが除外されること', async () => {
  // Arrange
  writeAdrFixture(tempDir, 1, 'First ADR', 'Accepted');
  writeTemplateFixture(tempDir);

  // Act
  const actual = await repository.findAll();

  // Assert
  expect(actual).toHaveLength(1);
  expect(actual[0].getFrontMatter().title).toBe('First ADR');
});
```

#### save - 正常系

```typescript
it('フロントマター+本文のMarkdownファイルが正しく書き出されること', async () => {
  // Arrange
  const adr = ADR.createFromTemplate(
    AdrId.create(1),
    'Phase Gate Adoption',
    'フェーズゲートの背景',
    'フェーズゲートを採用',
    '品質保証の実現',
    'スクラムのみの運用',
  );

  // Act
  await repository.save(adr);

  // Assert
  const filePath = path.join(tempDir, 'docs', 'ADR', '001-phase-gate-adoption.md');
  expect(fs.existsSync(filePath)).toBe(true);
  const content = fs.readFileSync(filePath, 'utf-8');
  expect(content).toContain('title: "Phase Gate Adoption"');
  expect(content).toContain('status: Proposed');
  expect(content).toContain('## Context');
  expect(content).toContain('フェーズゲートの背景');
});

it('書き出されたファイルが再読み込み可能であること', async () => {
  // Arrange
  const adr = ADR.createFromTemplate(
    AdrId.create(1),
    'Roundtrip Test',
    'ラウンドトリップテスト用コンテキスト',
    'ラウンドトリップテスト用決定',
    'ラウンドトリップテスト用結果',
    'ラウンドトリップテスト用代替案',
  );

  // Act
  await repository.save(adr);
  const actual = await repository.findById(AdrId.create(1));

  // Assert
  expect(actual).not.toBeNull();
  expect(actual!.getFrontMatter().title).toBe('Roundtrip Test');
  expect(actual!.getBody().context).toBe('ラウンドトリップテスト用コンテキスト');
  expect(actual!.getBody().decision).toBe('ラウンドトリップテスト用決定');
});

it('既存ファイルが上書き更新されること', async () => {
  // Arrange
  writeAdrFixture(tempDir, 1, 'Original Title', 'Proposed');
  const adr = ADR.createFromTemplate(
    AdrId.create(1),
    'Updated Title',
    '更新後コンテキスト',
    '更新後決定',
    '更新後結果',
    '更新後代替案',
  );

  // Act
  await repository.save(adr);
  const actual = await repository.findById(AdrId.create(1));

  // Assert
  expect(actual!.getFrontMatter().title).toBe('Updated Title');
  expect(actual!.getBody().context).toBe('更新後コンテキスト');
});

it('Superseded状態のADRを保存してfindByIdで再取得した場合にsuperseded_byが正しく復元されること', async () => {
  // Arrange
  const adr = ADR.createFromTemplate(
    AdrId.create(1),
    'Old Decision',
    '旧い決定の背景',
    '旧い決定',
    '旧い決定の影響',
    '旧い代替案',
  );
  const successorId = AdrId.create(5);
  writeAdrFixture(tempDir, 5, 'Successor Decision', 'Proposed');
  const supersededAdr = adr.supersede(successorId);

  // Act
  await repository.save(supersededAdr);
  const actual = await repository.findById(AdrId.create(1));

  // Assert
  expect(actual).not.toBeNull();
  expect(actual!.getFrontMatter().status).toBe(AdrStatus.Superseded);
  expect(actual!.getFrontMatter().supersededBy).not.toBeNull();
  expect(actual!.getFrontMatter().supersededBy!.successorId.value).toBe(5);
});
```

#### nextId - 正常系

```typescript
it('既存ADRの最大番号+1が返されること', async () => {
  // Arrange
  writeAdrFixture(tempDir, 1, 'First', 'Accepted');
  writeAdrFixture(tempDir, 3, 'Third', 'Proposed');

  // Act
  const actual = await repository.nextId();

  // Assert
  expect(actual.value).toBe(4);
});

it('1が返されること', async () => {
  // Arrange
  // ADRファイルなし

  // Act
  const actual = await repository.nextId();

  // Assert
  expect(actual.value).toBe(1);
});
```

#### exists

```typescript
it('存在するIDの場合trueが返されること', async () => {
  // Arrange
  writeAdrFixture(tempDir, 1, 'Test ADR', 'Proposed');
  const id = AdrId.create(1);

  // Act
  const actual = await repository.exists(id);

  // Assert
  expect(actual).toBe(true);
});

it('存在しないIDの場合falseが返されること', async () => {
  // Arrange
  const id = AdrId.create(999);

  // Act
  const actual = await repository.exists(id);

  // Assert
  expect(actual).toBe(false);
});
```

---

## 5. ADRライフサイクル統合テスト

**テストファイル**: `src/units/adr-documentation/__tests__/integration/adr-lifecycle.test.ts`
**モック**: なし（UseCase/Domain/Infrastructure全レイヤー実体使用）

### 目的

ADRの完全なライフサイクル（作成 -> 承認 -> 置換）を実ファイルシステム上で一貫して検証する。UseCase層・Domain層・Infrastructure層を統合し、永続化の往復（save -> findById）を通じて整合性を確認する。

### セットアップ

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { context, target } from '../../helpers/common-helper';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

let tempDir: string;
let repository: FileSystemAdrRepository;
let createAdrUseCase: CreateAdrUseCase;
let approveAdrUseCase: ApproveAdrUseCase;
let deprecateAdrUseCase: DeprecateAdrUseCase;
let supersedeAdrUseCase: SupersedeAdrUseCase;
let reproposeAdrUseCase: ReproposeAdrUseCase;
let findAdrByIdUseCase: FindAdrByIdUseCase;
let listAdrsUseCase: ListAdrsUseCase;
let validateAllUseCase: ValidateAllAdrFrontMattersUseCase;
let seedInitialAdrsUseCase: SeedInitialAdrsUseCase;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'adr-lifecycle-test-'));
  fs.mkdirSync(path.join(tempDir, 'docs', 'ADR'), { recursive: true });

  const parser = new YamlFrontMatterParser();
  repository = new FileSystemAdrRepository(tempDir, parser);

  createAdrUseCase = new CreateAdrUseCase(repository);
  approveAdrUseCase = new ApproveAdrUseCase(repository);
  deprecateAdrUseCase = new DeprecateAdrUseCase(repository);
  supersedeAdrUseCase = new SupersedeAdrUseCase(repository);
  reproposeAdrUseCase = new ReproposeAdrUseCase(repository);
  findAdrByIdUseCase = new FindAdrByIdUseCase(repository);
  listAdrsUseCase = new ListAdrsUseCase(repository);
  validateAllUseCase = new ValidateAllAdrFrontMattersUseCase(repository);
  seedInitialAdrsUseCase = new SeedInitialAdrsUseCase(repository);
});

afterEach(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});
```

### テストケースツリー

```
target('ADRライフサイクル', () => {
  describe('ADRの作成から置換までの完全なライフサイクルを検証する', () => {
    it('ADRを作成し、承認し、後継ADRで置換する一連のフローが正常に動作すること', ...)
    it('作成→廃止→再提案→承認のフローが正常に動作すること', ...)
  })

  describe('ADRの作成と永続化の往復を検証する', () => {
    it('作成したADRがファイルシステムに保存され、再読み込みで同一内容が復元されること', ...)
    it('ステータス変更後のADRがファイルシステムに反映されていること', ...)
  })

  describe('複数ADRの一覧取得と検証を確認する', () => {
    it('順不同で書き出されたADRファイルがID昇順で全件取得できること', ...)
    it('全ADRのフロントマターバリデーションが正常に通ること', ...)
    context('バリデーションエラーが存在する場合', () => {
      it('Superseded状態でsuperseded_byが未設定のADRファイルがある場合にバリデーションエラーが報告されること', ...)
      it('Proposed状態でsuperseded_byが設定されたADRファイルがある場合にバリデーションエラーが報告されること', ...)
      it('タイトルが空のADRファイルがある場合にバリデーションエラーが報告されること', ...)
      it('存在しない後継ADR番号が参照されている場合にバリデーションエラーが報告されること', ...)
    })
  })

  describe('初期ADRシードの生成を検証する', () => {
    it('シードデータからADRが一括生成されファイルシステムに保存されること', ...)
    it('シード実行後に再度シードを実行しても二重生成されないこと', ...)  // 冪等性
    it('事前に1件のADRが存在する状態でシードを実行した場合にスキップされ既存ファイルが変更されないこと', ...)
  })
})
```

### AAA原則の例外事項

> **注意**: ライフサイクル統合テストは複数遷移を1テストで検証するため、testing-rules.mdのAAA原則の例外とする。各Act/Assertブロックはコメントで明示的に区切る（`// --- Step N: 操作名 ---`）。各Assertポイントでは`actual`変数を使用する。

### 代表的なAAAパターン例

#### ライフサイクルフロー: 作成 -> 承認 -> 置換

```typescript
it('ADRを作成し、承認し、後継ADRで置換する一連のフローが正常に動作すること', async () => {
  // --- Step 1: Create old ADR ---
  // Act
  const actual = await createAdrUseCase.execute({
    title: 'Old Architecture Decision',
    context: '旧い設計判断の背景',
    decision: '旧い設計判断',
    consequences: '旧い設計判断の影響',
    alternatives: '検討した代替案',
  });

  // Assert
  expect(actual.getFrontMatter().status).toBe(AdrStatus.Proposed);
  expect(actual.id.value).toBe(1);
  const oldAdrId = actual.id;

  // --- Step 2: Approve old ADR ---
  // Act
  const actual2 = await approveAdrUseCase.execute(oldAdrId);

  // Assert
  expect(actual2.getFrontMatter().status).toBe(AdrStatus.Accepted);

  // --- Step 3: Create successor ADR ---
  // Act
  const actual3 = await createAdrUseCase.execute({
    title: 'New Architecture Decision',
    context: '新しい設計判断の背景',
    decision: '新しい設計判断',
    consequences: '新しい設計判断の影響',
    alternatives: '',
  });

  // Assert
  expect(actual3.id.value).toBe(2);
  const successorAdrId = actual3.id;

  // --- Step 4: Supersede old ADR with successor ---
  // Act
  const actual4 = await supersedeAdrUseCase.execute({
    targetId: oldAdrId,
    successorId: successorAdrId,
  });

  // Assert
  expect(actual4.getFrontMatter().status).toBe(AdrStatus.Superseded);
  expect(actual4.getFrontMatter().supersededBy!.successorId.value).toBe(2);

  // --- Step 5: Verify persistence ---
  // Act
  const actual5 = await findAdrByIdUseCase.execute(oldAdrId);

  // Assert
  expect(actual5).not.toBeNull();
  expect(actual5!.getFrontMatter().status).toBe(AdrStatus.Superseded);

  // --- Step 6: Validate all front matters ---
  // Act
  const actual6 = await validateAllUseCase.execute();

  // Assert
  expect(actual6.valid).toBe(true);
  expect(actual6.errors).toHaveLength(0);
});
```

#### ライフサイクルフロー: 作成 -> 廃止 -> 再提案 -> 承認

```typescript
it('作成→廃止→再提案→承認のフローが正常に動作すること', async () => {
  // --- Step 1: Create ADR ---
  // Arrange & Act
  const actual = await createAdrUseCase.execute({
    title: 'Revisited Decision',
    context: '再検討される決定の背景',
    decision: '当初の決定',
    consequences: '当初の影響',
    alternatives: '当初の代替案',
  });
  const adrId = actual.id;

  // --- Step 2: Deprecate ---
  // Act
  const actual2 = await deprecateAdrUseCase.execute(adrId);

  // Assert
  expect(actual2.getFrontMatter().status).toBe(AdrStatus.Deprecated);

  // --- Step 3: Repropose ---
  // Act
  const actual3 = await reproposeAdrUseCase.execute(adrId);

  // Assert
  expect(actual3.getFrontMatter().status).toBe(AdrStatus.Proposed);

  // --- Step 4: Approve ---
  // Act
  const actual4 = await approveAdrUseCase.execute(adrId);

  // Assert
  expect(actual4.getFrontMatter().status).toBe(AdrStatus.Accepted);

  // --- Step 5: Verify persistence ---
  // Act
  const actual5 = await findAdrByIdUseCase.execute(adrId);

  // Assert
  expect(actual5!.getFrontMatter().status).toBe(AdrStatus.Accepted);
});
```

#### 永続化の往復（ラウンドトリップ）

```typescript
it('作成したADRがファイルシステムに保存され、再読み込みで同一内容が復元されること', async () => {
  // Arrange
  const command = {
    title: 'Roundtrip Verification',
    context: '往復検証用の背景',
    decision: '往復検証用の決定',
    consequences: '往復検証用の結果',
    alternatives: '往復検証用の代替案',
  };

  // Act
  const created = await createAdrUseCase.execute(command);
  const actual = await findAdrByIdUseCase.execute(created.id);

  // Assert
  expect(actual).not.toBeNull();
  expect(actual!.getFrontMatter().title).toBe('Roundtrip Verification');
  expect(actual!.getFrontMatter().status).toBe(AdrStatus.Proposed);
  expect(actual!.getBody().context).toBe('往復検証用の背景');
  expect(actual!.getBody().decision).toBe('往復検証用の決定');
  expect(actual!.getBody().consequences).toBe('往復検証用の結果');
  expect(actual!.getBody().alternatives).toBe('往復検証用の代替案');
});
```

#### 複数ADRの一覧取得

```typescript
it('順不同で書き出されたADRファイルがID昇順で全件取得できること', async () => {
  // Arrange: IDが順不同のフィクスチャファイルを直接書き出す
  writeAdrFixture(tempDir, 3, 'Third Decision', 'Proposed');
  writeAdrFixture(tempDir, 1, 'First Decision', 'Accepted');
  writeAdrFixture(tempDir, 2, 'Second Decision', 'Accepted');

  // Act
  const actual = await listAdrsUseCase.execute();

  // Assert
  expect(actual).toHaveLength(3);
  expect(actual[0].id.value).toBe(1);
  expect(actual[0].getFrontMatter().title).toBe('First Decision');
  expect(actual[1].id.value).toBe(2);
  expect(actual[1].getFrontMatter().title).toBe('Second Decision');
  expect(actual[2].id.value).toBe(3);
  expect(actual[2].getFrontMatter().title).toBe('Third Decision');
});
```

#### フロントマターバリデーション異常系

```typescript
it('Superseded状態でsuperseded_byが未設定のADRファイルがある場合にバリデーションエラーが報告されること', async () => {
  // Arrange: superseded_byなしでSuperseded状態のフィクスチャを書き出す
  writeAdrFixture(tempDir, 1, 'Valid ADR', 'Accepted');
  writeAdrFixture(tempDir, 2, 'Missing Superseded By', 'Superseded');

  // Act
  const actual = await validateAllUseCase.execute();

  // Assert
  expect(actual.valid).toBe(false);
  expect(actual.errors.length).toBeGreaterThanOrEqual(1);
  expect(actual.errors.some((e) => e.adrId.value === 2)).toBe(true);
});

it('Proposed状態でsuperseded_byが設定されたADRファイルがある場合にバリデーションエラーが報告されること', async () => {
  // Arrange: Proposed状態なのにsuperseded_byが設定されたフィクスチャを書き出す
  writeAdrFixture(tempDir, 1, 'Invalid Proposed', 'Proposed', {
    supersededBy: 'docs/ADR/002',
  });
  writeAdrFixture(tempDir, 2, 'Some ADR', 'Accepted');

  // Act
  const actual = await validateAllUseCase.execute();

  // Assert
  expect(actual.valid).toBe(false);
  expect(actual.errors.length).toBeGreaterThanOrEqual(1);
  expect(actual.errors.some((e) => e.adrId.value === 1)).toBe(true);
});

it('タイトルが空のADRファイルがある場合にバリデーションエラーが報告されること', async () => {
  // Arrange: タイトルが空のフィクスチャを書き出す
  writeAdrFixture(tempDir, 1, '', 'Proposed');

  // Act
  const actual = await validateAllUseCase.execute();

  // Assert
  expect(actual.valid).toBe(false);
  expect(actual.errors.length).toBeGreaterThanOrEqual(1);
  expect(actual.errors.some((e) => e.adrId.value === 1)).toBe(true);
});

it('存在しない後継ADR番号が参照されている場合にバリデーションエラーが報告されること', async () => {
  // Arrange: 存在しないADR番号を参照するSuperseded ADRを書き出す
  writeAdrFixture(tempDir, 1, 'Superseded With Invalid Ref', 'Superseded', {
    supersededBy: 'docs/ADR/999',
  });

  // Act
  const actual = await validateAllUseCase.execute();

  // Assert
  expect(actual.valid).toBe(false);
  expect(actual.errors.length).toBeGreaterThanOrEqual(1);
  expect(actual.errors.some((e) => e.adrId.value === 1)).toBe(true);
});
```

#### シード生成と冪等性

```typescript
it('シードデータからADRが一括生成されファイルシステムに保存されること', async () => {
  // Arrange
  // (初期状態: ADRなし)

  // Act
  const actual = await seedInitialAdrsUseCase.execute();

  // Assert: 12件が生成されること（logical_design.md §8.2準拠）
  expect(actual).toHaveLength(12);
  const allAdrs = await listAdrsUseCase.execute();
  expect(allAdrs).toHaveLength(12);

  // Accepted 8件 / Proposed 4件の分布を検証（ADR 1-8: Accepted, ADR 9-12: Proposed）
  const acceptedAdrs = allAdrs.filter(
    (adr) => adr.getFrontMatter().status === AdrStatus.Accepted,
  );
  const proposedAdrs = allAdrs.filter(
    (adr) => adr.getFrontMatter().status === AdrStatus.Proposed,
  );
  expect(acceptedAdrs).toHaveLength(8);
  expect(proposedAdrs).toHaveLength(4);
});

it('シード実行後に再度シードを実行しても二重生成されないこと', async () => {
  // Arrange: 初回シード実行
  await seedInitialAdrsUseCase.execute();
  const countAfterFirst = (await listAdrsUseCase.execute()).length;

  // Act: 2回目のシード実行
  const actual = await seedInitialAdrsUseCase.execute();

  // Assert: 2回目は空配列（スキップ）
  expect(actual).toHaveLength(0);
  const countAfterSecond = (await listAdrsUseCase.execute()).length;
  expect(countAfterSecond).toBe(countAfterFirst);
});

it('事前に1件のADRが存在する状態でシードを実行した場合にスキップされ既存ファイルが変更されないこと', async () => {
  // Arrange: 事前に1件のADRをフィクスチャとして書き出す
  writeAdrFixture(tempDir, 1, 'Pre Existing ADR', 'Accepted');
  const existingContent = fs.readFileSync(
    path.join(tempDir, 'docs', 'ADR', '001-pre-existing-adr.md'),
    'utf-8',
  );

  // Act: findAllが0件でないためスキップされるはず
  const actual = await seedInitialAdrsUseCase.execute();

  // Assert: スキップされ空配列が返却されること
  expect(actual).toHaveLength(0);
  // 既存ファイルが変更されていないこと
  const afterContent = fs.readFileSync(
    path.join(tempDir, 'docs', 'ADR', '001-pre-existing-adr.md'),
    'utf-8',
  );
  expect(afterContent).toBe(existingContent);
  // ファイル数が増えていないこと
  const allAdrs = await listAdrsUseCase.execute();
  expect(allAdrs).toHaveLength(1);
});
```

---

## 6. テストケース総数サマリ

| テストファイル | テスト種別 | 推定テストケース数 |
|-------------|----------|----------------|
| `file-system-adr-repository.test.ts` | インテグレーション | 19 |
| `adr-lifecycle.test.ts` | インテグレーション | 13 |
| **合計** | | **32** |

---

## 7. 注意事項

### テスト実行環境

- テストは`os.tmpdir()`配下に一時ディレクトリを作成するため、ファイルシステムへの書き込み権限が必要
- CI環境でも`os.tmpdir()`は利用可能であるため特別な設定は不要
- 一時ディレクトリは`afterEach`で確実にクリーンアップされるため、テスト間の干渉は発生しない

### テストデータの独立性

- 各テストケースは独自の一時ディレクトリを使用するため、テスト間の状態共有は発生しない
- `beforeEach`で毎回新しいディレクトリとリポジトリインスタンスを作成する
- フィクスチャデータはテストケース内のArrangeフェーズで明示的に書き出す

### gray-matterの実体使用

- YamlFrontMatterParserはgray-matterライブラリの実体を使用する
- これはインテグレーションテストの目的（実際のI/Oを含む統合検証）に合致する
- gray-matterのバージョン変更時にテストが壊れる可能性があるが、これは意図した振る舞い（回帰検出）
