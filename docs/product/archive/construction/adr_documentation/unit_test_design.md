# ユニットテスト設計: adr-documentation

> **Unit ID**: adr-documentation
> **作成日**: 2026-03-11
> **対応ストーリー**: US-020, US-021, US-022
> **テストフレームワーク**: Vitest 3.0.0
> **入力**: `domain_model.md`, `logical_design.md`

### テスト設計方針ノート

> **例外系テストの AAA パターンについて**: 例外系テストでは `Act & Assert` を単一の `expect(...).toThrow()` 文で記述する。これは Vitest/Jest の標準パターンに従うものであり、testing-rules.md の AAA 原則の許容範囲とする。

> **`ADR.reconstruct` のスコープについて**: `ADR.reconstruct` は永続化からの復元に使用されるファクトリであり、バリデーションなしでインスタンスを生成する（logical_design.md L157/162）。`YamlFrontMatterParser` および `FileSystemAdrRepository` のテスト内で間接的に検証される。`FileSystemAdrRepository` は `it_test_design.md` でインテグレーションテストとしてカバーする。

> **`ValidateAllAdrFrontMattersUseCase` のフィクスチャ戦略について**: 異常系テストで不正な状態の ADR エンティティ（空タイトル、不正な supersededBy 等）が必要になるが、値オブジェクトのファクトリは不正値を拒否する。テストでは `ADR.reconstruct(...)` （logical_design.md L157）を使用して、ファクトリバリデーションをバイパスした ADR エンティティを生成する。これにより、本来ドメイン層が拒否する状態のエンティティをテスト用に構築できる。このパターンはテストヘルパーとして文書化し、再利用可能にすること。

---

## 1. テスト対象 x テストレイヤー対応表

| # | テスト対象 | レイヤー | テストファイル | モック対象 | 不変条件カバレッジ |
|---|-----------|---------|-------------|----------|----------------|
| 1 | ADR集約ルート | Domain | `adr.test.ts` | なし（実体） | INV-5, INV-6, INV-7 |
| 2 | AdrId | Domain | `adr-id.test.ts` | なし | — |
| 3 | AdrStatus | Domain | `adr-status.test.ts` | なし | INV-2, INV-5 |
| 4 | AdrFrontMatter | Domain | `adr-front-matter.test.ts` | なし | INV-3, INV-4, INV-7 |
| 5 | AdrBody | Domain | `adr-body.test.ts` | なし | INV-6 |
| 6 | SupersededByRef | Domain | `superseded-by-ref.test.ts` | なし | — |
| 7 | AdrFilePath | Domain | `adr-file-path.test.ts` | なし | — |
| 8 | CreateAdrUseCase | UseCase | `create-adr-use-case.test.ts` | AdrRepository | — |
| 9 | ListAdrsUseCase | UseCase | `list-adrs-use-case.test.ts` | AdrRepository | — |
| 10 | FindAdrByIdUseCase | UseCase | `find-adr-by-id-use-case.test.ts` | AdrRepository | — |
| 11 | ApproveAdrUseCase | UseCase | `approve-adr-use-case.test.ts` | AdrRepository | INV-5 |
| 12 | DeprecateAdrUseCase | UseCase | `deprecate-adr-use-case.test.ts` | AdrRepository | INV-5 |
| 13 | SupersedeAdrUseCase | UseCase | `supersede-adr-use-case.test.ts` | AdrRepository | INV-5, INV-8 |
| 14 | ReproposeAdrUseCase | UseCase | `repropose-adr-use-case.test.ts` | AdrRepository | INV-5 |
| 15 | ValidateAllAdrFrontMattersUseCase | UseCase | `validate-all-adr-front-matters-use-case.test.ts` | AdrRepository | INV-2, INV-3, INV-4, INV-7, INV-8 |
| 16 | SeedInitialAdrsUseCase | UseCase | `seed-initial-adrs-use-case.test.ts` | AdrRepository | — |
| 17 | AdrController | Controller | `adr-controller.test.ts` | 全UseCase | — |
| 18 | YamlFrontMatterParser | Infrastructure | `yaml-front-matter-parser.test.ts` | なし（gray-matter実体） | INV-3, INV-4, INV-7 |
| 19 | MarkdownSerializer | Infrastructure | `markdown-serializer.test.ts` | なし | INV-6 |

### モック戦略サマリ

| テスト対象レイヤー | ドメインオブジェクト | ポート（AdrRepository等） | UseCase |
|----------------|-----------------|------------------------|---------|
| Domain | **実体** | N/A | N/A |
| UseCase | **実体** | **モック**（vi.fn()） | N/A |
| Controller | N/A（DTOのみ） | N/A | **モック**（vi.fn()） |
| Infrastructure | **実体** | N/A | N/A |

---

## 2. Domain層テスト

### 2.1 ADR集約ルート

**テストファイル**: `src/units/adr-documentation/__tests__/domain/entities/adr.test.ts`
**モック**: なし（全て実体使用）

#### テストケースツリー

```
target('createFromTemplate', () => {
  describe('テンプレートからADRを生成する', () => {
    it('指定されたタイトルとコンテンツでProposed状態のADRが生成されること', ...)
    it('生成されたADRのファイルパスがID+タイトルから自動生成されていること', ...)
    it('生成日が現在日付で設定されること', ...)
    context('タイトルが空文字列の場合', () => {
      it('不正なフロントマター入力が拒否されること', ...)
    })
    context('タイトルが空白のみの場合', () => {
      it('不正なフロントマター入力が拒否されること', ...)
    })
    context('contextが空文字列の場合', () => {
      it('不正な本文では生成できないこと', ...)
    })
    context('decisionが空文字列の場合', () => {
      it('不正な本文では生成できないこと', ...)
    })
    context('consequencesが空文字列の場合', () => {
      it('不正な本文では生成できないこと', ...)
    })
    context('alternativesが空文字列の場合', () => {
      it('エラーなく生成されること', ...)
    })
  })
})

target('approve', () => {
  describe('ADRをProposedからAcceptedに遷移する', () => {
    it('ステータスがAcceptedに変更されること', ...)
    it('supersededByがnullのままであること', ...)
    context('ステータスがAcceptedの場合', () => {
      it('許可されていない状態遷移が拒否されること', ...)
    })
    context('ステータスがDeprecatedの場合', () => {
      it('許可されていない状態遷移が拒否されること', ...)
    })
    context('ステータスがSupersededの場合', () => {
      it('許可されていない状態遷移が拒否されること', ...)
    })
  })
})

target('deprecate', () => {
  describe('ADRをDeprecatedに遷移する', () => {
    context('ステータスがProposedの場合', () => {
      it('ステータスがDeprecatedに変更されること', ...)
    })
    context('ステータスがAcceptedの場合', () => {
      it('ステータスがDeprecatedに変更されること', ...)
    })
    context('ステータスがDeprecatedの場合', () => {
      it('許可されていない状態遷移が拒否されること', ...)
    })
    context('ステータスがSupersededの場合', () => {
      it('許可されていない状態遷移が拒否されること', ...)
    })
  })
})

target('supersede', () => {
  describe('ADRをSupersededに遷移し後継参照を設定する', () => {
    it('ステータスがSupersededに変更されること', ...)
    it('supersededByに後継ADR参照が設定されること', ...)
    context('ステータスがProposedの場合', () => {
      it('許可されていない状態遷移が拒否されること', ...)
    })
    context('ステータスがDeprecatedの場合', () => {
      it('許可されていない状態遷移が拒否されること', ...)
    })
    context('ステータスがSupersededの場合', () => {
      it('許可されていない状態遷移が拒否されること', ...)
    })
  })
})

target('repropose', () => {
  describe('DeprecatedからProposedに再提案する', () => {
    it('ステータスがProposedに変更されること', ...)
    it('supersededByがnullであること', ...)
    context('ステータスがProposedの場合', () => {
      it('許可されていない状態遷移が拒否されること', ...)
    })
    context('ステータスがAcceptedの場合', () => {
      it('許可されていない状態遷移が拒否されること', ...)
    })
    context('ステータスがSupersededの場合', () => {
      it('許可されていない状態遷移が拒否されること', ...)
    })
  })
})

target('updateBody', () => {
  describe('ADRの本文を更新する', () => {
    it('本文が新しい内容に更新されること', ...)
    it('ステータスやフロントマターは変更されないこと', ...)
  })
})
```

#### 代表的なAAAパターン例

```typescript
// createFromTemplate - 正常系
it('指定されたタイトルとコンテンツでProposed状態のADRが生成されること', () => {
  // Arrange
  const nextId = AdrId.create(1);
  const title = 'Phase Gate Adoption';
  const context = '意思決定の背景';
  const decision = '技術的判断の内容';
  const consequences = '決定による影響';
  const alternatives = '検討された代替案';

  // Act
  const actual = ADR.createFromTemplate(nextId, title, context, decision, consequences, alternatives);

  // Assert
  expect(actual.id.equals(nextId)).toBe(true);
  expect(actual.getFrontMatter().status).toBe(AdrStatus.Proposed);
  expect(actual.getFrontMatter().title).toBe(title);
  expect(actual.getBody().context).toBe(context);
});

// approve - 異常系
it('許可されていない状態遷移が拒否されること', () => {
  // Arrange
  const adr = createAcceptedAdr(); // ヘルパー: Accepted状態のADRを生成

  // Act & Assert
  expect(() => adr.approve()).toThrow(InvalidAdrStatusTransitionError);
});

// supersede - 正常系
it('supersededByに後継ADR参照が設定されること', () => {
  // Arrange
  const adr = createAcceptedAdr();
  const successorId = AdrId.create(5);

  // Act
  adr.supersede(successorId);

  // Assert
  const actual = adr.getFrontMatter().supersededBy;
  expect(actual).not.toBeNull();
  expect(actual!.successorId.equals(successorId)).toBe(true);
});
```

#### 不変条件カバレッジ

| 不変条件 | テストケース |
|---------|------------|
| INV-5 | approve/deprecate/supersede/repropose の全不許可遷移パターン |
| INV-6 | createFromTemplate の context/decision/consequences 空文字列 |
| INV-7 | createFromTemplate のタイトル空文字列・空白のみ |

---

### 2.2 AdrId

**テストファイル**: `src/units/adr-documentation/__tests__/domain/value-objects/adr-id.test.ts`
**モック**: なし

#### テストケースツリー

```
target('create', () => {
  describe('正の整数からAdrIdを生成する', () => {
    it('正の整数で正常に生成されること', ...)
    context('0が指定された場合', () => {
      it('不正なID値では生成できないこと', ...)
    })
    context('負の数が指定された場合', () => {
      it('不正なID値では生成できないこと', ...)
    })
    context('小数が指定された場合', () => {
      it('不正なID値では生成できないこと', ...)
    })
  })
})

target('toDisplayString', () => {
  describe('3桁ゼロパディングで表示する', () => {
    it('1が"001"と表示されること', ...)
    it('12が"012"と表示されること', ...)
    it('100が"100"と表示されること', ...)
  })
})

target('equals', () => {
  describe('同じ値のAdrId同士を比較する', () => {
    it('同じ値の場合trueを返すこと', ...)
    it('異なる値の場合falseを返すこと', ...)
  })
})
```

#### 代表的なAAAパターン例

```typescript
it('正の整数で正常に生成されること', () => {
  // Arrange
  const value = 5;

  // Act
  const actual = AdrId.create(value);

  // Assert
  expect(actual.value).toBe(5);
});

it('1が"001"と表示されること', () => {
  // Arrange
  const id = AdrId.create(1);

  // Act
  const actual = id.toDisplayString();

  // Assert
  expect(actual).toBe('001');
});

it('不正なID値では生成できないこと', () => {
  // Arrange
  const value = -1;

  // Act & Assert
  expect(() => AdrId.create(value)).toThrow(InvalidAdrIdError);
});
```

---

### 2.3 AdrStatus

**テストファイル**: `src/units/adr-documentation/__tests__/domain/value-objects/adr-status.test.ts`
**モック**: なし

#### テストケースツリー

```
target('canTransitionTo', () => {
  describe('許可された遷移パスを判定する', () => {
    // Proposed からの遷移（4パターン）
    context('ProposedからProposedへの遷移', () => {
      it('falseを返すこと', ...)
    })
    context('ProposedからAcceptedへの遷移', () => {
      it('trueを返すこと', ...)
    })
    context('ProposedからDeprecatedへの遷移', () => {
      it('trueを返すこと', ...)
    })
    context('ProposedからSupersededへの遷移', () => {
      it('falseを返すこと', ...)
    })

    // Accepted からの遷移（4パターン）
    context('AcceptedからProposedへの遷移', () => {
      it('falseを返すこと', ...)
    })
    context('AcceptedからAcceptedへの遷移', () => {
      it('falseを返すこと', ...)
    })
    context('AcceptedからDeprecatedへの遷移', () => {
      it('trueを返すこと', ...)
    })
    context('AcceptedからSupersededへの遷移', () => {
      it('trueを返すこと', ...)
    })

    // Deprecated からの遷移（4パターン）
    context('DeprecatedからProposedへの遷移', () => {
      it('trueを返すこと', ...)
    })
    context('DeprecatedからAcceptedへの遷移', () => {
      it('falseを返すこと', ...)
    })
    context('DeprecatedからDeprecatedへの遷移', () => {
      it('falseを返すこと', ...)
    })
    context('DeprecatedからSupersededへの遷移', () => {
      it('falseを返すこと', ...)
    })

    // Superseded からの遷移（4パターン）
    context('SupersededからProposedへの遷移', () => {
      it('falseを返すこと', ...)
    })
    context('SupersededからAcceptedへの遷移', () => {
      it('falseを返すこと', ...)
    })
    context('SupersededからDeprecatedへの遷移', () => {
      it('falseを返すこと', ...)
    })
    context('SupersededからSupersededへの遷移', () => {
      it('falseを返すこと', ...)
    })
  })
})

target('fromString', () => {
  describe('文字列からAdrStatusに変換する', () => {
    it('"Proposed"が正常に変換されること', ...)
    it('"Accepted"が正常に変換されること', ...)
    it('"Deprecated"が正常に変換されること', ...)
    it('"Superseded"が正常に変換されること', ...)
    context('不正な文字列が指定された場合', () => {
      it('不正なフロントマター入力が拒否されること', ...)
    })
    context('空文字列が指定された場合', () => {
      it('不正なフロントマター入力が拒否されること', ...)
    })
  })
})
```

#### 4x4遷移マトリクス

| From \ To | Proposed | Accepted | Deprecated | Superseded |
|-----------|----------|----------|------------|------------|
| **Proposed** | false | **true** | **true** | false |
| **Accepted** | false | false | **true** | **true** |
| **Deprecated** | **true** | false | false | false |
| **Superseded** | false | false | false | false |

**太字** = 許可された遷移（trueを返す）

#### 代表的なAAAパターン例

```typescript
it('trueを返すこと', () => {
  // Arrange
  const from = AdrStatus.Proposed;
  const to = AdrStatus.Accepted;

  // Act
  const actual = from.canTransitionTo(to);

  // Assert
  expect(actual).toBe(true);
});

it('不正なフロントマター入力が拒否されること', () => {
  // Arrange
  const invalidValue = 'InvalidStatus';

  // Act & Assert
  expect(() => AdrStatus.fromString(invalidValue)).toThrow(InvalidAdrFrontMatterError);
});
```

---

### 2.4 AdrFrontMatter

**テストファイル**: `src/units/adr-documentation/__tests__/domain/value-objects/adr-front-matter.test.ts`
**モック**: なし

#### テストケースツリー

```
target('create', () => {
  describe('フロントマターを生成する', () => {
    it('正常な入力で生成されること', ...)
    it('Proposed状態でsupersededByがnullの場合に正常に生成されること', ...)
    context('タイトルが空文字列の場合', () => {
      it('不正なフロントマター入力が拒否されること', ...)  // INV-7
    })
    context('タイトルが空白のみの場合', () => {
      it('不正なフロントマター入力が拒否されること', ...)  // INV-7
    })
    context('SupersededステータスでsupersededByがnullの場合', () => {
      it('不正なフロントマター入力が拒否されること', ...)  // INV-3
    })
    context('ProposedステータスでsupersededByが設定されている場合', () => {
      it('不正なフロントマター入力が拒否されること', ...)  // INV-4
    })
    context('AcceptedステータスでsupersededByが設定されている場合', () => {
      it('不正なフロントマター入力が拒否されること', ...)  // INV-4
    })
    context('DeprecatedステータスでsupersededByが設定されている場合', () => {
      it('不正なフロントマター入力が拒否されること', ...)  // INV-4
    })
  })
})

target('withStatus', () => {
  describe('ステータスを変更した新しいフロントマターを生成する', () => {
    it('指定されたステータスの新インスタンスが返されること', ...)
    it('supersededByがnullに設定されること', ...)
    it('元のインスタンスは変更されないこと', ...)
  })
})

target('withStatusAndSupersededBy', () => {
  describe('ステータスとsupersededByを設定した新しいフロントマターを生成する', () => {
    it('Supersededステータスと後継参照が設定された新インスタンスが返されること', ...)
    it('元のインスタンスは変更されないこと', ...)
  })
})
```

#### 不変条件カバレッジ

| 不変条件 | テストケース |
|---------|------------|
| INV-3 | SupersededステータスでsupersededByがnullの場合 |
| INV-4 | Proposed/Accepted/DeprecatedステータスでsupersededByが設定されている場合（3ケース） |
| INV-7 | タイトルが空文字列の場合、タイトルが空白のみの場合 |

#### 代表的なAAAパターン例

```typescript
// INV-3
it('不正なフロントマター入力が拒否されること', () => {
  // Arrange
  const title = 'Test ADR';
  const status = AdrStatus.Superseded;
  const date = new Date('2026-03-11');
  const supersededBy = null;

  // Act & Assert
  expect(() => AdrFrontMatter.create(title, status, date, supersededBy))
    .toThrow(InvalidAdrFrontMatterError);
});

// INV-4
it('不正なフロントマター入力が拒否されること', () => {
  // Arrange
  const title = 'Test ADR';
  const status = AdrStatus.Proposed;
  const date = new Date('2026-03-11');
  const supersededBy = SupersededByRef.create(AdrId.create(5));

  // Act & Assert
  expect(() => AdrFrontMatter.create(title, status, date, supersededBy))
    .toThrow(InvalidAdrFrontMatterError);
});
```

---

### 2.5 AdrBody

**テストファイル**: `src/units/adr-documentation/__tests__/domain/value-objects/adr-body.test.ts`
**モック**: なし

#### テストケースツリー

```
target('create', () => {
  describe('ADR本文を生成する', () => {
    it('全フィールド指定で正常に生成されること', ...)
    it('alternativesが空文字列でも正常に生成されること', ...)
    context('contextが空文字列の場合', () => {
      it('不正な本文では生成できないこと', ...)  // INV-6
    })
    context('contextが空白のみの場合', () => {
      it('不正な本文では生成できないこと', ...)  // INV-6
    })
    context('decisionが空文字列の場合', () => {
      it('不正な本文では生成できないこと', ...)  // INV-6
    })
    context('decisionが空白のみの場合', () => {
      it('不正な本文では生成できないこと', ...)  // INV-6
    })
    context('consequencesが空文字列の場合', () => {
      it('不正な本文では生成できないこと', ...)  // INV-6
    })
    context('consequencesが空白のみの場合', () => {
      it('不正な本文では生成できないこと', ...)  // INV-6
    })
  })
})
```

#### 代表的なAAAパターン例

```typescript
it('全フィールド指定で正常に生成されること', () => {
  // Arrange
  const context = '意思決定の背景';
  const decision = '技術的判断の内容';
  const consequences = '決定による影響';
  const alternatives = '検討された代替案';

  // Act
  const actual = AdrBody.create(context, decision, consequences, alternatives);

  // Assert
  expect(actual.context).toBe(context);
  expect(actual.decision).toBe(decision);
  expect(actual.consequences).toBe(consequences);
  expect(actual.alternatives).toBe(alternatives);
});

it('alternativesが空文字列でも正常に生成されること', () => {
  // Arrange
  const context = '意思決定の背景';
  const decision = '技術的判断の内容';
  const consequences = '決定による影響';
  const alternatives = '';

  // Act
  const actual = AdrBody.create(context, decision, consequences, alternatives);

  // Assert
  expect(actual.alternatives).toBe('');
});
```

---

### 2.6 SupersededByRef

**テストファイル**: `src/units/adr-documentation/__tests__/domain/value-objects/superseded-by-ref.test.ts`
**モック**: なし

#### テストケースツリー

```
target('create', () => {
  describe('後継ADR参照を生成する', () => {
    it('有効なAdrIdで正常に生成されること', ...)
    it('successorIdが正しく保持されること', ...)
  })
})

target('toReferenceString', () => {
  describe('フロントマター用の参照文字列を生成する', () => {
    it('"docs/ADR/{NNN}"形式の文字列が返されること', ...)
  })
})
```

#### 代表的なAAAパターン例

```typescript
it('"docs/ADR/{NNN}"形式の文字列が返されること', () => {
  // Arrange
  const successorId = AdrId.create(5);
  const ref = SupersededByRef.create(successorId);

  // Act
  const actual = ref.toReferenceString();

  // Assert
  expect(actual).toBe('docs/ADR/005');
});
```

---

### 2.7 AdrFilePath

**テストファイル**: `src/units/adr-documentation/__tests__/domain/value-objects/adr-file-path.test.ts`
**モック**: なし

#### テストケースツリー

```
target('generateFrom', () => {
  describe('IDとタイトルからファイルパスを生成する', () => {
    it('正常なタイトルでkebab-caseのパスが生成されること', ...)
    it('大文字が小文字に変換されること', ...)
    it('スペースがハイフンに変換されること', ...)
    it('連続するハイフンが単一ハイフンに正規化されること', ...)
    it('特殊文字が除去されてハイフンに置換されること', ...)
    it('先頭・末尾のハイフンが除去されること', ...)
  })
})
```

#### 代表的なAAAパターン例

```typescript
it('正常なタイトルでkebab-caseのパスが生成されること', () => {
  // Arrange
  const id = AdrId.create(1);
  const title = 'Phase Gate Adoption';

  // Act
  const actual = AdrFilePath.generateFrom(id, title);

  // Assert
  expect(actual.value).toBe('docs/ADR/001-phase-gate-adoption.md');
});

it('特殊文字が除去されてハイフンに置換されること', () => {
  // Arrange
  const id = AdrId.create(3);
  const title = 'ESLint→Biome Migration';

  // Act
  const actual = AdrFilePath.generateFrom(id, title);

  // Assert
  expect(actual.value).toBe('docs/ADR/003-eslint-biome-migration.md');
});
```

---

## 3. UseCase層テスト

### 共通モック戦略

全UseCaseテストで以下のモックリポジトリパターンを使用する。ドメインオブジェクト（ADR, 値オブジェクト）は**実体**を使用する。

```typescript
// 各テストファイル内で定義
const mockRepository: AdrRepository = {
  findById: vi.fn(),
  findAll: vi.fn(),
  save: vi.fn(),
  nextId: vi.fn(),
  exists: vi.fn(),
};
```

### テストヘルパー

テストケース間で共有するADR生成ヘルパーを用意する。

```typescript
// __tests__/helpers/adr-test-helper.ts

/** Proposed状態のADRを生成する */
function createProposedAdr(id: number = 1, title: string = 'Test ADR'): ADR {
  return ADR.createFromTemplate(
    AdrId.create(id),
    title,
    'テスト用コンテキスト',
    'テスト用決定',
    'テスト用結果',
    'テスト用代替案',
  );
}

/** Accepted状態のADRを生成する */
function createAcceptedAdr(id: number = 1, title: string = 'Test ADR'): ADR {
  const adr = createProposedAdr(id, title);
  adr.approve();
  return adr;
}

/** Deprecated状態のADRを生成する */
function createDeprecatedAdr(id: number = 1, title: string = 'Test ADR'): ADR {
  const adr = createProposedAdr(id, title);
  adr.deprecate();
  return adr;
}

/** Superseded状態のADRを生成する */
function createSupersededAdr(id: number = 1, successorId: number = 2): ADR {
  const adr = createAcceptedAdr(id);
  adr.supersede(AdrId.create(successorId));
  return adr;
}
```

---

### 3.1 CreateAdrUseCase

**テストファイル**: `src/units/adr-documentation/__tests__/usecase/create-adr-use-case.test.ts`
**モック**: AdrRepository

```
target('execute', () => {
  describe('新規ADRを作成して永続化する', () => {
    it('採番されたIDでADRが生成されること', ...)
    it('生成されたADRがリポジトリに保存されること', ...)
    it('生成されたADRが返却されること', ...)
    context('タイトルが空文字列の場合', () => {
      it('不正なフロントマター入力が拒否されること', ...)
    })
  })
})
```

#### 代表的なAAAパターン例

```typescript
it('採番されたIDでADRが生成されること', async () => {
  // Arrange
  const nextId = AdrId.create(3);
  mockRepository.nextId = vi.fn().mockResolvedValue(nextId);
  mockRepository.save = vi.fn().mockResolvedValue(undefined);
  const useCase = new CreateAdrUseCase(mockRepository);
  const command: CreateAdrCommand = {
    title: 'New Decision',
    context: '背景',
    decision: '決定',
    consequences: '結果',
    alternatives: '代替案',
  };

  // Act
  const actual = await useCase.execute(command);

  // Assert
  expect(actual.id.equals(nextId)).toBe(true);
  expect(actual.getFrontMatter().status).toBe(AdrStatus.Proposed);
  expect(mockRepository.save).toHaveBeenCalledWith(actual);
});
```

---

### 3.2 ListAdrsUseCase

**テストファイル**: `src/units/adr-documentation/__tests__/usecase/list-adrs-use-case.test.ts`
**モック**: AdrRepository

```
target('execute', () => {
  describe('全ADRを一覧取得する', () => {
    it('リポジトリから取得した全ADRが返却されること', ...)
    context('ADRが0件の場合', () => {
      it('空配列が返却されること', ...)
    })
  })
})
```

#### 代表的なAAAパターン例

```typescript
it('リポジトリから取得した全ADRが返却されること', async () => {
  // Arrange
  const adrs = [createProposedAdr(1, 'ADR 1'), createAcceptedAdr(2, 'ADR 2')];
  mockRepository.findAll = vi.fn().mockResolvedValue(adrs);
  const useCase = new ListAdrsUseCase(mockRepository);

  // Act
  const actual = await useCase.execute();

  // Assert
  expect(actual).toHaveLength(2);
  expect(mockRepository.findAll).toHaveBeenCalledOnce();
});
```

---

### 3.3 FindAdrByIdUseCase

**テストファイル**: `src/units/adr-documentation/__tests__/usecase/find-adr-by-id-use-case.test.ts`
**モック**: AdrRepository

```
target('execute', () => {
  describe('指定IDのADRを取得する', () => {
    it('指定IDに一致するADRが返却されること', ...)
    context('指定IDのADRが存在しない場合', () => {
      it('nullが返却されること', ...)
    })
  })
})
```

---

### 3.4 ApproveAdrUseCase

**テストファイル**: `src/units/adr-documentation/__tests__/usecase/approve-adr-use-case.test.ts`
**モック**: AdrRepository

```
target('execute', () => {
  describe('ADRをAcceptedに遷移して永続化する', () => {
    it('ステータスがAcceptedに変更されて保存されること', ...)
    it('更新されたADRが返却されること', ...)
    context('対象ADRが存在しない場合', () => {
      it('存在しないADRの操作は失敗すること', ...)
    })
    context('ステータスがAcceptedの場合', () => {
      it('許可されていない状態遷移が拒否されること', ...)
    })
  })
})
```

#### 代表的なAAAパターン例

```typescript
it('ステータスがAcceptedに変更されて保存されること', async () => {
  // Arrange
  const adr = createProposedAdr(1);
  const adrId = AdrId.create(1);
  mockRepository.findById = vi.fn().mockResolvedValue(adr);
  mockRepository.save = vi.fn().mockResolvedValue(undefined);
  const useCase = new ApproveAdrUseCase(mockRepository);

  // Act
  const actual = await useCase.execute(adrId);

  // Assert
  expect(actual.getFrontMatter().status).toBe(AdrStatus.Accepted);
  expect(mockRepository.save).toHaveBeenCalledOnce();
});

it('存在しないADRの操作は失敗すること', async () => {
  // Arrange
  const adrId = AdrId.create(999);
  mockRepository.findById = vi.fn().mockResolvedValue(null);
  const useCase = new ApproveAdrUseCase(mockRepository);

  // Act & Assert
  await expect(useCase.execute(adrId)).rejects.toThrow();
});
```

---

### 3.5 DeprecateAdrUseCase

**テストファイル**: `src/units/adr-documentation/__tests__/usecase/deprecate-adr-use-case.test.ts`
**モック**: AdrRepository

```
target('execute', () => {
  describe('ADRをDeprecatedに遷移して永続化する', () => {
    context('ステータスがProposedの場合', () => {
      it('ステータスがDeprecatedに変更されて保存されること', ...)
    })
    context('ステータスがAcceptedの場合', () => {
      it('ステータスがDeprecatedに変更されて保存されること', ...)
    })
    context('対象ADRが存在しない場合', () => {
      it('存在しないADRの操作は失敗すること', ...)
    })
    context('ステータスがSupersededの場合', () => {
      it('許可されていない状態遷移が拒否されること', ...)
    })
  })
})
```

---

### 3.6 SupersedeAdrUseCase

**テストファイル**: `src/units/adr-documentation/__tests__/usecase/supersede-adr-use-case.test.ts`
**モック**: AdrRepository

```
target('execute', () => {
  describe('ADRをSupersededに遷移する', () => {
    it('後継ADRが存在する場合、正常にSupersededに遷移すること', ...)
    it('supersededByに後継ADR参照が設定されること', ...)
    it('更新されたADRがリポジトリに保存されること', ...)
    context('対象ADRが存在しない場合', () => {
      it('存在しないADRの操作は失敗すること', ...)
    })
    context('後継ADR番号が存在しない場合', () => {
      it('参照先不存在エラーがスローされること', ...)  // INV-8
    })
    context('対象ADRのステータスがProposedの場合', () => {
      it('許可されていない状態遷移が拒否されること', ...)
    })
  })
})
```

#### 代表的なAAAパターン例（INV-8検証）

```typescript
it('参照先不存在エラーがスローされること', async () => {
  // Arrange
  const targetAdr = createAcceptedAdr(1);
  const targetId = AdrId.create(1);
  const successorId = AdrId.create(999);
  mockRepository.findById = vi.fn().mockResolvedValue(targetAdr);
  mockRepository.exists = vi.fn().mockResolvedValue(false); // 後継ADR不存在
  const useCase = new SupersedeAdrUseCase(mockRepository);

  // Act & Assert
  await expect(
    useCase.execute({ targetId, successorId })
  ).rejects.toThrow(InvalidAdrFrontMatterError);
});

it('後継ADRが存在する場合、正常にSupersededに遷移すること', async () => {
  // Arrange
  const targetAdr = createAcceptedAdr(1);
  const targetId = AdrId.create(1);
  const successorId = AdrId.create(2);
  mockRepository.findById = vi.fn().mockResolvedValue(targetAdr);
  mockRepository.exists = vi.fn().mockResolvedValue(true);
  mockRepository.save = vi.fn().mockResolvedValue(undefined);
  const useCase = new SupersedeAdrUseCase(mockRepository);

  // Act
  const actual = await useCase.execute({ targetId, successorId });

  // Assert
  expect(actual.getFrontMatter().status).toBe(AdrStatus.Superseded);
  expect(actual.getFrontMatter().supersededBy!.successorId.equals(successorId)).toBe(true);
  expect(mockRepository.exists).toHaveBeenCalledWith(successorId);
});
```

---

### 3.7 ReproposeAdrUseCase

**テストファイル**: `src/units/adr-documentation/__tests__/usecase/repropose-adr-use-case.test.ts`
**モック**: AdrRepository

```
target('execute', () => {
  describe('DeprecatedからProposedに再提案して永続化する', () => {
    it('ステータスがProposedに変更されて保存されること', ...)
    context('対象ADRが存在しない場合', () => {
      it('存在しないADRの操作は失敗すること', ...)
    })
    context('ステータスがAcceptedの場合', () => {
      it('許可されていない状態遷移が拒否されること', ...)
    })
  })
})
```

---

### 3.8 ValidateAllAdrFrontMattersUseCase

**テストファイル**: `src/units/adr-documentation/__tests__/usecase/validate-all-adr-front-matters-use-case.test.ts`
**モック**: AdrRepository

```
target('execute', () => {
  describe('全ADRのフロントマター整合性を一括検証する', () => {
    it('全ADRが正常な場合、valid:trueで空のerrorsが返されること', ...)
    context('SupersededのADRにsupersededByが未設定の場合', () => {
      it('該当ADRのバリデーションエラーが報告されること', ...)  // INV-3
    })
    context('Superseded以外のADRにsupersededByが設定されている場合', () => {
      it('該当ADRのバリデーションエラーが報告されること', ...)  // INV-4
    })
    context('タイトルが空のADRが存在する場合', () => {
      it('該当ADRのバリデーションエラーが報告されること', ...)  // INV-7
    })
    context('SupersededのADRのsupersededBy参照先が存在しない場合', () => {
      it('参照先不存在エラーが報告されること', ...)  // INV-8
    })
    context('複数のADRにバリデーションエラーがある場合', () => {
      it('全てのエラーが集約されて報告されること', ...)
    })
    context('ADRが0件の場合', () => {
      it('valid:trueで空のerrorsが返されること', ...)
    })
  })
})
```

---

### 3.9 SeedInitialAdrsUseCase

**テストファイル**: `src/units/adr-documentation/__tests__/usecase/seed-initial-adrs-use-case.test.ts`
**モック**: AdrRepository

```
target('execute', () => {
  describe('初期ADRを一括生成する', () => {
    it('シードデータの件数分のADRが生成されること', ...)
    it('各ADRが正しいステータスで生成されること', ...)
    it('repository.saveがシードデータの件数分呼ばれること', ...)
    it('Acceptedステータスのシードが承認済みで保存されること', ...)
    it('Proposedステータスのシードが提案状態で保存されること', ...)
    context('既にADRが存在する場合', () => {
      it('処理をスキップし空配列を返却すること', ...)  // 冪等性
      // NOTE: 冪等性はlogical_design.mdの処理フローには未定義。実装時にlogical_design.mdを更新するか、
      // このテストケースを削除すること。現時点では設計先行として残す。
    })
  })
})
```

#### 代表的なAAAパターン例（冪等性テスト）

```typescript
it('処理をスキップし空配列を返却すること', async () => {
  // Arrange
  const existingAdrs = [createAcceptedAdr(1, 'Existing ADR')];
  mockRepository.findAll = vi.fn().mockResolvedValue(existingAdrs);
  const useCase = new SeedInitialAdrsUseCase(mockRepository);

  // Act
  const actual = await useCase.execute();

  // Assert
  expect(actual).toHaveLength(0);
  expect(mockRepository.save).not.toHaveBeenCalled();
});
```

---

## 4. Controller層テスト

### 4.1 AdrController

**テストファイル**: `src/units/adr-documentation/__tests__/controller/adr-controller.test.ts`
**モック**: 全UseCase（vi.fn()）

#### モック戦略

```typescript
const mockCreateAdrUseCase = { execute: vi.fn() };
const mockListAdrsUseCase = { execute: vi.fn() };
const mockFindAdrByIdUseCase = { execute: vi.fn() };
const mockApproveAdrUseCase = { execute: vi.fn() };
const mockDeprecateAdrUseCase = { execute: vi.fn() };
const mockSupersedeAdrUseCase = { execute: vi.fn() };
const mockReproposeAdrUseCase = { execute: vi.fn() };
const mockValidateAllUseCase = { execute: vi.fn() };
const mockSeedInitialAdrsUseCase = { execute: vi.fn() };

const controller = new AdrController(
  mockCreateAdrUseCase,
  mockListAdrsUseCase,
  mockFindAdrByIdUseCase,
  mockApproveAdrUseCase,
  mockDeprecateAdrUseCase,
  mockSupersedeAdrUseCase,
  mockReproposeAdrUseCase,
  mockValidateAllUseCase,
  mockSeedInitialAdrsUseCase,
);
```

#### テストケースツリー

```
target('createAdr', () => {
  describe('プリミティブ入力からADRを作成する', () => {
    it('入力DTOがUseCaseに渡されてADRが作成されること', ...)
    it('UseCaseの結果が出力DTOに変換されること', ...)
    it('alternativesが未指定の場合に空文字列としてUseCaseに渡されること', ...)
  })
})

target('listAdrs', () => {
  describe('全ADRを一覧取得する', () => {
    it('ADR一覧が出力DTO形式で返却されること', ...)
    it('totalがADR件数と一致すること', ...)
  })
})

target('findAdrById', () => {
  describe('指定IDのADRを取得する', () => {
    it('プリミティブなnumberがAdrIdに変換されてUseCaseに渡されること', ...)
    context('ADRが存在しない場合', () => {
      it('nullが返却されること', ...)
    })
    context('adrIdが0の場合', () => {
      it('不正なID値では生成できないこと', ...)
    })
    context('adrIdが負の数の場合', () => {
      it('不正なID値では生成できないこと', ...)
    })
  })
})

target('changeStatus', () => {
  describe('ステータス変更アクションに応じたUseCaseを呼び出す', () => {
    context('actionが"approve"の場合', () => {
      it('ApproveAdrUseCaseが呼び出されること', ...)
    })
    context('actionが"deprecate"の場合', () => {
      it('DeprecateAdrUseCaseが呼び出されること', ...)
    })
    context('actionが"repropose"の場合', () => {
      it('ReproposeAdrUseCaseが呼び出されること', ...)
    })
    context('adrIdが0の場合', () => {
      it('不正なID値では生成できないこと', ...)
    })
    context('adrIdが負の数の場合', () => {
      it('不正なID値では生成できないこと', ...)
    })
  })
})

target('supersedeAdr', () => {
  describe('ADRをSupersededに遷移する', () => {
    it('プリミティブなnumberがAdrIdに変換されてUseCaseに渡されること', ...)
    it('結果が出力DTOに変換されること', ...)
    context('successorAdrIdが0の場合', () => {
      it('不正なID値では生成できないこと', ...)
    })
    context('successorAdrIdが負の数の場合', () => {
      it('不正なID値では生成できないこと', ...)
    })
  })
})

target('validateAllFrontMatters', () => {
  describe('全ADRのフロントマターを一括検証する', () => {
    it('検証結果がValidationOutput形式で返却されること', ...)
  })
})

target('seedInitialAdrs', () => {
  describe('初期ADRを一括生成する', () => {
    it('生成結果がAdrListOutput形式で返却されること', ...)
  })
})
```

#### 代表的なAAAパターン例

```typescript
it('ApproveAdrUseCaseが呼び出されること', async () => {
  // Arrange
  const adr = createProposedAdr(1);
  mockApproveAdrUseCase.execute = vi.fn().mockResolvedValue(adr);
  const input: ChangeStatusInput = { adrId: 1, action: 'approve' };

  // Act
  const actual = await controller.changeStatus(input);

  // Assert
  expect(mockApproveAdrUseCase.execute).toHaveBeenCalledOnce();
  expect(actual.id).toBe(1);
});

it('UseCaseの結果が出力DTOに変換されること', async () => {
  // Arrange
  const adr = createProposedAdr(1, 'Test ADR');
  mockCreateAdrUseCase.execute = vi.fn().mockResolvedValue(adr);
  const input: CreateAdrInput = {
    title: 'Test ADR',
    context: '背景',
    decision: '決定',
    consequences: '結果',
  };

  // Act
  const actual = await controller.createAdr(input);

  // Assert
  expect(actual.displayId).toBe('001');
  expect(actual.title).toBe('Test ADR');
  expect(actual.status).toBe('Proposed');
  expect(actual.body.context).toBe('背景');
});
```

---

## 5. Infrastructure層テスト（ユニットテスト）

### 5.1 YamlFrontMatterParser

**テストファイル**: `src/units/adr-documentation/__tests__/infrastructure/yaml-front-matter-parser.test.ts`
**モック**: なし（gray-matter実体使用）

> gray-matterは外部ライブラリだが、パーサーの動作検証のため実体を使用する。ポート経由で利用しているため将来のライブラリ差し替えは容易。

#### テストケースツリー

```
target('parse', () => {
  describe('Markdown文字列からフロントマターを抽出する', () => {
    it('正常なYAMLフロントマターがAdrFrontMatterに変換されること', ...)
    it('本文部分がcontentとして返されること', ...)
    it('日付文字列がDateオブジェクトに変換されること', ...)
    it('superseded_byフィールドがSupersededByRefに変換されること', ...)
    it('superseded_byが未定義の場合にnullが返されること', ...)
    context('フロントマターが存在しない場合', () => {
      it('パースに失敗すること', ...)
    })
    context('titleが未定義の場合', () => {
      it('パースに失敗すること', ...)
    })
    context('statusが不正な値の場合', () => {
      it('不正なフロントマター入力が拒否されること', ...)
    })
    context('statusが未定義の場合', () => {
      it('パースに失敗すること', ...)
    })
    context('dateが不正な文字列の場合', () => {
      it('パースに失敗すること', ...)
    })
    context('superseded_byがプレーンな数値の場合', () => {
      it('数値からADR番号が正しく抽出されること', ...)
    })
    context('superseded_byが不正な参照文字列の場合', () => {
      it('パースに失敗すること', ...)
    })
  })
})

target('serialize', () => {
  describe('AdrFrontMatterをYAML文字列に変換する', () => {
    it('正常なフロントマターがYAML形式で出力されること', ...)
    it('YAML文字列が---デリミタで囲まれること', ...)
    it('日付がYYYY-MM-DD形式で出力されること', ...)
    it('Superseded状態の場合superseded_byが含まれること', ...)
    it('Proposed状態の場合superseded_byが含まれないこと', ...)
  })
})
```

#### 代表的なAAAパターン例

```typescript
it('正常なYAMLフロントマターがAdrFrontMatterに変換されること', () => {
  // Arrange
  const markdown = `---
title: "Phase Gate Adoption"
status: Accepted
date: "2026-03-11"
---

## Context

Some context here.`;
  const parser = new YamlFrontMatterParser();

  // Act
  const actual = parser.parse(markdown);

  // Assert
  expect(actual.frontMatter.title).toBe('Phase Gate Adoption');
  expect(actual.frontMatter.status).toBe(AdrStatus.Accepted);
  expect(actual.frontMatter.supersededBy).toBeNull();
  expect(actual.content).toContain('Some context here.');
});

it('superseded_byフィールドがSupersededByRefに変換されること', () => {
  // Arrange
  const markdown = `---
title: "Old Decision"
status: Superseded
date: "2026-03-01"
superseded_by: "docs/ADR/005"
---

## Context

Replaced.`;
  const parser = new YamlFrontMatterParser();

  // Act
  const actual = parser.parse(markdown);

  // Assert
  expect(actual.frontMatter.status).toBe(AdrStatus.Superseded);
  expect(actual.frontMatter.supersededBy).not.toBeNull();
  expect(actual.frontMatter.supersededBy!.successorId.value).toBe(5);
});
```

---

### 5.2 MarkdownSerializer

**テストファイル**: `src/units/adr-documentation/__tests__/infrastructure/markdown-serializer.test.ts`
**モック**: なし

#### テストケースツリー

```
target('serializeBody', () => {
  describe('AdrBodyをMarkdownセクション構造に変換する', () => {
    it('4セクションが正しいヘッダーで出力されること', ...)
    it('各セクションの内容が正しく出力されること', ...)
    it('alternativesが空文字列でもセクションが出力されること', ...)
  })
})

target('deserializeBody', () => {
  describe('Markdownセクション構造からAdrBodyに変換する', () => {
    it('正常なMarkdownからAdrBodyが生成されること', ...)
    it('セクション名の大文字小文字が区別されないこと', ...)
    it('セクション本文の前後空白がtrimされること', ...)
    context('Contextセクションが欠落している場合', () => {
      it('不正な本文では生成できないこと', ...)
    })
    context('Decisionセクションが欠落している場合', () => {
      it('不正な本文では生成できないこと', ...)
    })
    context('Consequencesセクションが欠落している場合', () => {
      it('不正な本文では生成できないこと', ...)
    })
    context('Alternativesセクションが欠落している場合', () => {
      it('alternativesが空文字列としてAdrBodyが生成されること', ...)
    })
  })
})
```

#### 代表的なAAAパターン例

```typescript
it('4セクションが正しいヘッダーで出力されること', () => {
  // Arrange
  const body = AdrBody.create('背景', '決定', '結果', '代替案');

  // Act
  const actual = MarkdownSerializer.serializeBody(body);

  // Assert
  expect(actual).toContain('## Context');
  expect(actual).toContain('## Decision');
  expect(actual).toContain('## Consequences');
  expect(actual).toContain('## Alternatives');
});

it('正常なMarkdownからAdrBodyが生成されること', () => {
  // Arrange
  const markdown = `## Context

意思決定の背景

## Decision

技術的判断の内容

## Consequences

決定による影響

## Alternatives

検討された代替案`;

  // Act
  const actual = MarkdownSerializer.deserializeBody(markdown);

  // Assert
  expect(actual.context).toBe('意思決定の背景');
  expect(actual.decision).toBe('技術的判断の内容');
  expect(actual.consequences).toBe('決定による影響');
  expect(actual.alternatives).toBe('検討された代替案');
});

it('不正な本文では生成できないこと', () => {
  // Arrange
  const markdown = `## Decision

技術的判断の内容

## Consequences

決定による影響`;

  // Act & Assert
  expect(() => MarkdownSerializer.deserializeBody(markdown)).toThrow(InvalidAdrBodyError);
});
```

---

## 6. 不変条件カバレッジマトリクス

全不変条件がテストケースで網羅されていることを確認する。

| 不変条件 | 説明 | カバーするテストファイル | テストケース数 |
|---------|------|---------------------|-------------|
| INV-1 | ADR番号は全ADR内で一意 | `it_test_design.md`（FileSystemAdrRepository.nextId / 作成フローIT）で担保 | — |
| INV-2 | statusは4つの許容値のいずれか | `adr-status.test.ts`, `validate-all-*.test.ts` | 6+ |
| INV-3 | Superseded時、supersededByは必須 | `adr-front-matter.test.ts`, `validate-all-*.test.ts` | 2 |
| INV-4 | Superseded以外時、supersededByはnull | `adr-front-matter.test.ts`, `validate-all-*.test.ts` | 4 |
| INV-5 | 遷移は許可パスのみ | `adr-status.test.ts`（16パターン）, `adr.test.ts` | 16+ |
| INV-6 | context/decision/consequencesは空文字列不可 | `adr-body.test.ts`, `adr.test.ts`, `markdown-serializer.test.ts` | 6+ |
| INV-7 | titleは空文字列不可 | `adr-front-matter.test.ts`, `adr.test.ts`, `validate-all-*.test.ts` | 3+ |
| INV-8 | SupersededByRefの参照先ADRが存在 | `supersede-adr-use-case.test.ts`, `validate-all-*.test.ts` | 2 |

---

## 7. テストケース総数サマリ

| カテゴリ | テストファイル数 | 推定テストケース数 |
|---------|-------------|----------------|
| Domain層（集約） | 1 | 22 |
| Domain層（値オブジェクト） | 6 | 42 |
| UseCase層 | 9 | 32 |
| Controller層 | 1 | 22 |
| Infrastructure層（UT） | 2 | 22 |
| **合計** | **19** | **140** |

> **スコープ外の補足**: `FileSystemAdrRepository` は `it_test_design.md` でインテグレーションテストとしてカバーする。`ADR.reconstruct` は永続化からの復元に使用されるファクトリであり、`YamlFrontMatterParser` および `FileSystemAdrRepository` のテスト内で間接的に検証される。本ユニットテスト設計には含めない。
