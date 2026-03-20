# テスト規約

```
凡例
#テストレイヤー
##規約タイトル
###OK
###NG
```

---

![image.png](%E3%83%86%E3%82%B9%E3%83%88%E8%A6%8F%E7%B4%84/image.png)

# Index

### 全テスト共通

[テスト関連ファイルの名称はすべてkebab-caseにする](https://www.notion.so/kebab-case-1d65fb52a4aa80d99cc6fb336a528a64?pvs=21) 

[テストケース名は全て日本語で記述する](https://www.notion.so/1d65fb52a4aa80e8a340e04abf238806?pvs=21) 

[実装の詳細はテストケース名に表さない](https://www.notion.so/1dd5fb52a4aa80fcbb5cc5b99d79fc80?pvs=21) 

[自動テストは**AAAパターンで記述する**](https://www.notion.so/AAA-1e55fb52a4aa80e7b917e460c8fef6c9?pvs=21) 

### テストサイズ：Large

**E2Eテスト**

[E2Eテストは、ドメインエキスパートやPdMやCSが見てわかる内容にする](https://www.notion.so/E2E-PdM-CS-1dc5fb52a4aa80bf8e6cc88ccd2ea5f1?pvs=21) 

### テストサイズ：Medium

**Page UIテスト**

[バックエンドとの通信はMSWを使ってMockする](https://www.notion.so/MSW-Mock-22b5fb52a4aa80848a7ec39502a7e25a?pvs=21) 

**インテグレーションテスト**

[テストケース名は、**何も知らない**開発者が見てわかる内容にする](https://www.notion.so/1d65fb52a4aa806a8690d2938eab0e0c?pvs=21) 

[テストケースを記述するdescribe()とit()の書きっぷり](https://www.notion.so/describe-it-1e35fb52a4aa8045a359f847fcc4f5ee?pvs=21) 

### テストサイズ：Small

**ユニットテスト**

[テストケース名は、**何も知らない**開発者が見てわかる内容にする](https://www.notion.so/1dc5fb52a4aa80cf92f0ec74c5b5ac18?pvs=21) 

[**(WIP)**モックオブジェクトは外部依存に対してのみ利用する](https://www.notion.so/WIP-1e45fb52a4aa8004ac43daca7af73be7?pvs=21) 

[テストケースを記述するdescribe()とit()の書きっぷり](https://www.notion.so/describe-it-1e65fb52a4aa80b7ac04f003a84468eb?pvs=21) 

---

# 全テスト共通

## テスト関連ファイルの名称はすべてkebab-caseにする

### OK

```

fetch-contract-v2-by-user.seed.ts
```

### NG

```
fetchContractV2ByUser.seed.ts
FetchContractV2ByUser.seed.ts
fetch_contract_V2_by_user.seed.ts
```

### 背景

Gitはファイル名の大文字・小文字を区別しない設定になっていることがあり、ファイル名をたとえば `FileName.txt` から `filename.txt` に変更しても、Gitが変更を検出せずに無視してしまい予期せぬインポートエラーなどが発生するリスクがあるため

### 捕捉

テスト関連ファイルに限らず、基本的にすべてkebabケースでファイル名称を統一する。

(例外として、hostingのコンポーネントに関してのみcamelで現状書き進めているので保留)

## テストケース名は全て日本語で記述する

### OK

```tsx
//e2e
## 拠点内のフリースペースの情報が一覧で表示される
* フリースペースマスタ一覧の"1"行目の"定員"に"10"が表示されている

//インテグレーションテスト,ユニットテスト
it('データに不備がある契約明細をインポートした際に、インポートに失敗すること', async () => {}
```

### NG

```tsx
//e2e
## Free space information can be displayed in list
* The "Capacity" column in the first row of the Free Space Master list displays "10".

// インテグレーションテスト,ユニットテスト
it('Fails - returns 404 when resource does not exis', async()=>{})
```

### 背景

- 動く仕様書として実行可能なテストを書く戦略

### 捕捉

- テストケースの書きっぷりについては以下を参照。
    - [E2Eテストは、ドメインエキスパートやPdMやCSが見てわかる内容にする](https://www.notion.so/E2E-PdM-CS-1dc5fb52a4aa80bf8e6cc88ccd2ea5f1?pvs=21)
    - [テストケース名は、**何も知らない**開発者が見てわかる内容にする](https://www.notion.so/1d65fb52a4aa806a8690d2938eab0e0c?pvs=21)
    - [テストケース名は、**何も知らない**開発者が見てわかる内容にする](https://www.notion.so/1dc5fb52a4aa80cf92f0ec74c5b5ac18?pvs=21)

## 実装の詳細はテストケース名に表さない

### OK

```tsx
it('渡されたプロバイダーIDの中にLINEがある場合はLINEの問い合わせ先を返す')
```

### NG

```tsx
it('externalUserInfoIdに紐づくデータがUserDBに存在する場合、UserInfoModelを返す(user = test1@exapmle.com)', async () => {}
// 内部のプロパティ名やクラス名などの実装に、テストケースの記述が依存している
// 仕様とは関係ない、テストデータの情報が書かれている
```

### 背景

- 実装の詳細に依存したテストの場合、**リファクタリングへの耐性が失われ、壊れやすいテストになってしまう。**その結果以下のような弊害が生じる。
    - リファクタリングのハードルが上がってしまう。例えばexternalUserInfoIdというプロパティがリファクタリングされてプロパティ名が変更された場合、テストケース名も修正する必要が出てくる
    - 実装の詳細まで知らないと(見に行かないと)そのテストケースで担保したいことが理解できない(読みづらい仕様書になる=テストコードの理解容易性が損なわれる)
        - [テストケース名は、**何も知らない**開発者が見てわかる内容にする](https://www.notion.so/1d65fb52a4aa806a8690d2938eab0e0c?pvs=21)(インテグレーションテスト)
        - [テストケース名は、**何も知らない**開発者が見てわかる内容にする](https://www.notion.so/1dc5fb52a4aa80cf92f0ec74c5b5ac18?pvs=21) (ユニットテスト)

## 自動テストは**AAAパターンで記述する**

### OK

```tsx
it('ユーザーが存在する場合、UserWishRepositoryから取得した結果をそのまま返すこと', async () => {
      // Arrange
      defaultMocks(...)//テストの関心ごとでない共通Arrangeを呼び出し
      mockUserRepository.isExisting = vi.fn().mockResolvedValue(true);
      const userWishModels = [new InProgressUserWishModel({ userWishId: 'wish-1', content: 'content-1' })];
      mockUserWishRepository.findMultiByUserId = vi.fn().mockResolvedValue(userWishModels);
			const userId = "test_user";
			const baseId = "test_base";

      // Act
      const result = await sut.findUserWishByUserIdAndBaseId(userId, baseId, [UserWishStatus.IN_PROGRESS]);

      // Assert
      expect(mockUserRepository.isExisting).toHaveBeenCalledWith(userId);
      expect(result).toEqual(userWishModels);
  });
});
```

### NG

```tsx
describe('ユーザーWishの情報を取得する', () => {  
  beforeEach(() => {
      vi.clearAllMocks();
      vi.resetAllMocks();
      usecase = reserveSpaceUsecase(dependencies);
      //必要なArrangeがテストの外で行われている
			mockIssueNoService.issueNo = vi.fn().mockResolvedValue('RES001');
		  mockRefundSpaceReservationService.calcReservationAmount = vi.fn().mockReturnValue(1100);
		  mockGoogleCalendarService.authenticate = vi.fn().mockResolvedValue(undefined);      
  });

	it('ユーザーが存在する場合、UserWishRepositoryから取得した結果をそのまま返すこと', async () => {
      // テストの関心ごとでないmockも直接Arrangeしている
      mockSpaceReservationRepository.getDupricatedReservationsCount = vi.fn().mockResolvedValue(0);
      mockSpaceReservationRepository.findMultiByGoogleCalendarEventId = vi.fn().mockResolvedValue([]);
      mockSpaceReservationRepository.save = vi.fn().mockResolvedValue(undefined);
      mockUserRepository.isExisting = vi.fn().mockResolvedValue(true);
      const userWishModels = [new InProgressUserWishModel({ userWishId: 'wish-1', content: 'content-1' })];
      mockUserWishRepository.findMultiByUserId = vi.fn().mockResolvedValue(userWishModels);
			const userId = "test_user";
			const baseId = "test_base";

      // Act
      const result = await sut.findUserWishByUserIdAndBaseId(userId, baseId, [UserWishStatus.IN_PROGRESS]);

      // Assert
      expect(mockUserRepository.isExisting).toHaveBeenCalledWith(userId);
      expect(result).toEqual(userWishModels);
	  });
	});
});
```

### 背景

- AAAパターンとはテストケース構造に関するパターンのこと。このパターンでは、テストケースを準備(Arrange)、実行(Act)、確認(Assert)の3つのフェーズで構成される。
- AAAパターンを用いることで、テストスイートに含まれるすべてのテストケースに対して簡潔で統一された構造を持たせられるようになる
    - この構造を維持すると、どのようなテストケースであっても可読性が向上する
    - そのテストケースに必要な処理が凝集するため**テストの独立性**が保たれる(これがデカい)
- 結果的にテストの保守コストを大きく削減できる

### 補足

- テストの関心ごとでない、共通部分のArrangeを複数のテストケースで行いたい場合に、そのまま記述すると冗長な書き方になるため、オブジェクトマザーやファクトリーなどで工夫する必要がある

### 関連

- Assert First(Assertionから書くTDDプロセスの基本テクニック)

[[enknot LT] AAAの話](https://www.notion.so/enknot-LT-AAA-22b5fb52a4aa8078a0abe1ba35af86f8?pvs=21)

## テストの実行結果はactualに代入する

### OK

```tsx
    const actual = await usecase.execute(spaceId, baseId);

    expect(actual).toBeUndefined();
```

### NG

```tsx
  const result = await usecase.execute(spaceId, baseId);

	expect(result).toBeUndefined();
```

変数名を統一するため、resultには代入しないようにする

---

# E2Eテスト / シードデータ

## テストケース固有のデータは専用のseedファイルで管理する

### OK

```
e2e/seeds/
├── users.seed.ts                    # 全テスト共通のユーザーデータ
└── dev-dummy-process.seed.ts        # DevDummyプロセス固有のテストデータ
```

```typescript
// dev-dummy-process.seed.ts
export async function seedDevDummyProcesses(): Promise<void> {
    // テストケースに必要なプロセスデータを作成
}
```

### NG

```typescript
// spec.tsの中でbeforeEachにデータセットアップを直書きする
beforeEach(async () => {
    // 他のテストケースでも使い回せるデータを直書きしている
    await createProcess({ label: 'テスト用' });
});
```

### 背景

- テストデータの独立性を担保するため、テストケース固有のデータセットアップは専用のseedファイルに切り出す
- 共通データ（ユーザー等）と機能固有データを分離することで、テストスイートの見通しが良くなる
- seedファイルを分けることで、特定の機能のテストデータだけを再作成・クリーンアップしやすくなる

### 補足

- 全テスト共通のデータ（ユーザー等）は `users.seed.ts` のような共通seedに置く
- 特定のテストケースにしか使わないデータは、そのテストケース内で `afterEach` によるクリーンアップとセットで管理する

---

# E2Eテスト

## E2Eテストは実行リソースを考慮してテストケースを統合する

### 方針

E2Eテストは1ケースごとにログイン・データ作成・API呼び出し等のセットアップコストが高い。そのため、以下の条件を満たすテストケースは1つのテストケースに統合する。

1. **同一のArrangeを共有している**: プロセス作成やイベント発火など、事前準備が同じテストケース群
2. **段階的に検証できる**: 1つのテスト内でAct→Assertを繰り返すことで、ライフサイクル全体を一貫して検証できる場合
3. **前のステップの結果が次の前提条件になっている**: テストケース間に因果関係がある場合

### OK

```typescript
// 1つのテストで確認依頼のライフサイクル全体を検証
test('確認依頼のライフサイクル: 生成→対応済み→再生成', async ({ page }) => {
    // Arrange: プロセス作成（1回だけ）
    const { devDummyProcessId } = await createDevDummyProcess(page, { ... });

    // Act & Assert 1: AI_EXECUTED → PENDINGで表示される
    await fireEvent(page, devDummyProcessId, { eventType: 'AI_EXECUTED', ... });
    await expect(page.getByTestId('intervention-request-status')).toHaveText('PENDING');

    // Act & Assert 2: INTERVENTION → 未対応一覧から消える
    await fireEvent(page, devDummyProcessId, { eventType: 'INTERVENTION', ... });
    // ... RESPONDEDに遷移したことを確認

    // Act & Assert 3: 再度AI_EXECUTED → 新しい未対応が1件
    await fireEvent(page, devDummyProcessId, { eventType: 'AI_EXECUTED', ... });
    // ... 未対応が1件のみであることを確認
});
```

### NG

```typescript
// 同一Arrangeのテストケースを個別に分けている（リソースの無駄）
test('確認依頼がPENDINGで表示される', async ({ page }) => {
    const { devDummyProcessId } = await createDevDummyProcess(page, { ... });
    await fireEvent(page, devDummyProcessId, { eventType: 'AI_EXECUTED', ... });
    // Assert...
});

test('介入後に確認依頼がRESPONDEDになる', async ({ page }) => {
    const { devDummyProcessId } = await createDevDummyProcess(page, { ... }); // 同じArrangeを繰り返し
    await fireEvent(page, devDummyProcessId, { eventType: 'AI_EXECUTED', ... });
    await fireEvent(page, devDummyProcessId, { eventType: 'INTERVENTION', ... });
    // Assert...
});
```

### 背景

- E2Eテストはテストピラミッドの頂点に位置し、実行コストが最も高い
- 1ケースごとにブラウザ操作・認証・データ作成・API呼び出しが発生するため、不必要にケースを分割するとCI/CDパイプラインの実行時間が増大する
- 同一のArrangeを共有するテストケースを統合することで、セットアップコストを1回に削減しつつ、ライフサイクル全体の整合性も検証できる

### 補足

- 統合の判断基準は「Arrangeの共有度」と「テストケース間の因果関係」
- 独立した前提条件を持つテストケース（例: 異なるユーザーロール、異なるプロセス状態）は統合しない
- 表示系の検証（タイトル・クライアント名・バッジ等）も同一Arrangeであれば1テスト内で段階的にAssertする

---

## E2Eテストは、ドメインエキスパートやPdMやCSが見てわかる内容にする

### OK

```tsx
//edit.spec
* フリースペースID"1"に紐づくフリースペースマスタ編集画面を直接開く
* 編集フォームに定員"10"を入力する
* 保存ボタンを押下する（画面が自動更新される）
* 定員が"10"で表示されていることを確認する 
```

### NG

```tsx
//edit.spec
* freeSpaceId"1"に紐づくFreeSpaceMasterEditScreenを直リンでwindow.openする
* FreeSpaceMasterEditScreenのcapacityフォームに"10"をインプットする
* 保存ボタンを押す
* 指定したfreeSpaceIdに紐づく単一FreeSpaceのcapacityの値が"10"である
```

### 背景

- まず自然言語で仕様を言語化し、その言語化された内容にそって自動テストを書き、実装することによって**「動く仕様書」**を整え、運用する方針
    - そのため、テストケースには「仕様書としての表現力」が備わっていることが重要
    - E2Eテストは、ユーザーストーリーの受け入れ基準となるテストケースであり、ユーザーストーリーが提供する機能的なふるまいの価値を表現するものになるため、非開発メンバーが見てもわかる表現であることが重要

---

# Page UIテスト

### 背景

- まず自然言語で仕様を言語化し、その言語化された内容にそって自動テストを書き、実装することによって**「動く仕様書」**を整え、運用する方針
    - そのため、テストケースには「仕様書としての表現力」が備わっていることが重要
    - PageUIのテストは、画面要素の操作とその結果の挙動をテストケースとして表現するものであり、エンジニアがその画面の仕様と動作を正確に認知できる表現であることが重要

## バックエンドとの通信はMSWを使ってMockする

### OK

```tsx
// xxxx.handler.ts
export const defaultMockHandlers = () => {
  // NOTE: Cloud Functions
  const baseMockHandler = getFetchBaseMockHandler(base);
  const contractMockHandler = getFetchContractV2ByUserMockHandler();
  const spaceMockHandler = getSearchSpacesMockHandler({ spaces: [] });
  const fetchSpaceMockHandler = getFetchSpaceUsagesMockHandler();
  const fetchUser = getFetchUserByExternalIdMockHandler(user);
  // NOTE: Cloud Run
  const roleMockHandler = getCreateUserRolePermissionMockHandler();

  return [baseMockHandler, contractMockHandler, spaceMockHandler, roleMockHandler, fetchSpaceMockHandler, fetchUser];
};

// xxxx.spec.ts
target('リソースカテゴリー(予約画面の最上部にあるタグ)', () => {
  describe('画面を開いたユーザーの属性に応じて、表示されるカテゴリーが変化する', () => {
    context('一般利用者の場合', () => {
      it('一般利用者が予約可能なカテゴリーのみが表示されていること', async ({ network, page }) => {
        const defaultMock = defaultMockHandlers();
        // arrange
        network.use(...defaultMock);
        // act
        await page.goto('http://localhost:3000/base/test-base/space/reserve');
        // assert
        await expect(page.getByRole('tab', { name: '会議室1' })).toBeVisible();
        await expect(page.getByRole('tab', { name: '会議室2' })).not.toBeVisible();
      });
    });
  });
});
```

### NG

```tsx
// mockせずに正規のバックエンドとデータベースを使用する
```

### 背景

- 正規のバックエンドとデータベースを使用するとテストデータの作成コストもテストの実行コストも大きいが、apiをmockすることでコストを削減できる
    - テストには直接関わらないデータベースの依存関係などを気にしなくていい
    - http通信やバックエンドの計算がなくなることで実行時間が短縮
- その他にも、テストの安定性向上やフロント単体での実装が可能になるメリットがある
    - レスポンスが固定されることでFlakyテストの発生を抑制
    - バックエンド未実装でもフロント単体で実装可能

### 補足

- Cloud Functionのmock handlerは`hosting/test/page-ui/utils/msw/cloud-function.msw.ts`に定義済み
- Cloud Runのmock handlerはOrvalで`hosting/src/__generated`配下に自動生成される
    - 存在しない場合は`npm run generate`
- mockする際、responseを任意の値にしたい場合は値をhandlerに渡し、どんな値でも良い場合は何も渡さずに実行すればよい
- firebase Authenticationは初期状態でダミーのユーザーとして認証される
- httpリクエストが発生したURLに対して複数のhandlerがヒットした場合、先に定義されたものが優先される。共通handlerと個別handlerを定義した場合は個別handlerを先に使用する
    - `network.use(...overrideMock, ...defaultMock);`

---

# インテグレーションテスト

## テストケース名は、**何も知らない**開発者が見てわかる内容にする

### OK

```tsx
 it('指定したスペースIDが存在しない場合は、404を返す', async () => {}
```

### NG

```tsx
 it('FAILURE1 - 指定したパラメータのidが不正なパターン(user = test1@exapmle.com)', async () => {}
// 統一されていない独自ルールの接頭辞
// 指定したパラメータとは何か、テストメソッドの内部をしっかり確認しに行かないとI/Oが把握できない（テスト実装者のみ、指定したパラメータとは何か頭の中で分かっている）
// 不正とはどういう状態なのかわからない
// テストケースとは直接関係ない実装の知識やテストデータの詳細が滲んでいる
```

### 背景

- まず自然言語で仕様を言語化し、その言語化された内容にそって自動テストを書き、実装することによって**「動く仕様書」**を整え、運用する方針
    - そのため、テストケースには「仕様書としての表現力」が備わっていることが重要

### 捕捉

- 「何も知らない開発者」とは、例えば以下のような人物を指す。
    - 他のチームや新しくチームに入った開発者
    - 記憶をなくした未来の自分
- [実装の詳細はテストケース名に表さない](https://www.notion.so/1dd5fb52a4aa80fcbb5cc5b99d79fc80?pvs=21)

## テストケースを記述するdescribe()とit()の書きっぷり

### OK

```tsx
import { describe, expect, it } from 'vitest';
import { context, target } from '../../helper/common-helper';

target('saveQuestionnaireAnswer', () => {
  describe('アンケート回答情報を受け取り、保存した回答IDを返す', () => {
    it('アンケート回答情報を受け取り、ステータスコード200と保存した回答IDを返す', () => {
      // テストの実装を書く
    });
    context('対象のquestionnaireが存在しない時', () => {
	    it('ステータスコード404を返す', () => {
	      // テストの実装を書く	   
	    });
	  });
  });
  describe('アンケート回答の保存が成功した場合、回答者にメッセージを配信する', () => {
    it('LINEメッセージを配信する', () => {
      // テストの実装を書く
    });
    it('メールを配信する', () => {
      // テストの実装を書く
    });
  });
});

```

### NG

```tsx
import { describe, expect, it } from 'vitest';
import { context, target } from '../../helper/common-helper';

// テスト対象のクラス名を記載してしまっている
// describeのエイリアスを使えていない
describe('ContractInventionRecipientModel', ()=>{
  describe('saveQuestionnaireAnswer', () => {
    describe('アンケート回答情報を受け取り、保存した回答IDを返す', () => {
      it('アンケート回答情報を受け取り、ステータスコード200と保存した回答IDを返す', () => {
        // テストの実装を書く
      });
    });
  });
})
```

### 構文解説

- target..テスト対象のメソッド
- describe…テスト対象メソッドのふるまい説明
- (context…検証したいふるまいに前提条件があればcontextとして記載)
- it…期待値

### 背景

- テストコードは上から下に読みやすい形式で書きたいため
    - itに条件まで記載すると認知負荷が高まってしまう
- テストコードをtargetやcontextの観点で構造化することで、各テストケースの目的や前提条件がより明確となり、全体の可読性と保守性が向上する

---

# ユニットテスト

## テストケース名は、**何も知らない**開発者が見てわかる内容にする

### OK

```tsx
it('渡されたプロバイダーIDの中にLINEがある場合はLINEの問い合わせ先を返す', () => {}
```

### NG

```tsx
it('ProviderIdに基づきLineContactPointModelを返す', () => {}
// 内部のプロパティ名やクラス名にテストケースの記述が依存しているため、内部実装を把握していないと振る舞いがわかりにくい
```

### 背景

- まず自然言語で仕様を言語化し、その言語化された内容にそって自動テストを書き、実装することによって**「動く仕様書」**を整え、運用する方針
    - そのため、テストケースには「仕様書としての表現力」が備わっていることが重要

### 捕捉

- 「何も知らない開発者」とは、例えば以下のような人物を指す。
    - 他のチームや新しくチームに入った開発者
    - 記憶をなくした未来の自分
- [実装の詳細はテストケース名に表さない](https://www.notion.so/1dd5fb52a4aa80fcbb5cc5b99d79fc80?pvs=21)

### **(WIP)**モックオブジェクトは外部依存に対してのみ利用する

### OK

```tsx

```

### NG

```tsx
 
```

### 背景

- 管理下にある外部依存はモックしない
    - テスト対象のアプリケーションが自由に扱えるもの
    - アクセス対象のプロセス外依存にアクセスするのにテスト対象だけが経由できる状況は、実質的には実装の詳細と言える(外部から観察できない)
    - これをモックにしてしまうと、偽陽性が高まる(モックを使っているのでテストは通るが、実際には通らないプログラムが生まれやすくなる)
- 管理下にない外部依存のみ、モックを利用する
    - テスト対象のアプリケーションが自由に扱えないもの
    - 外部から観察できる
    - テスト対象と管理下にない外部依存との間のコミュニケーションが正しく行われているかを担保するために、モックを使ってテストする
- Usecaseレイヤー単体から見ると、Portは管理下にない外部依存であり、Domainは管理下にある外部依存である
    - 前者はモックを利用し、後者はMockを利用せずに実体を使ってテストする
    - データ取得・保存の「結果」ではなく「ビジネスルールの適用プロセス」を検証するというユースケースの単体テストの目的にも合致する(そのための依存性逆転)

## テストケースを記述するdescribe()とit()の書きっぷり

### OK

```jsx
import { describe, expect, it } from 'vitest';
import { context, target } from '../../helper/common-helper';

target('getBaseContactPoint', () => {
  describe('providerIdsに応じた連絡先を返す', () => {
    context('providerIdsにLINEが含まれている場合', () => {
      it('LINEの問い合わせ先を返す', () => {
        // テストの実装を書く
      });
    });
    context('providerIdsにLINEが含まれていない場合', () => {
      it('EMAILの問い合わせ先を返す', () => {
        // テストの実装を書く
      });
    });
    context('providerIdsの配列が空の場合', () => {
      it('hogeエラーをthrowする', () => {
        // テストの実装を書く
        expect(statusCode).equal("401");
        expect(message).equal("エラーメッセージ");
      });
    });
  });
});
```

### NG

```jsx

import { describe, expect, it } from 'vitest';
import { context, target } from '../../helper/common-helper';

// targetを使っていない
describe('getBaseContactPoint', () => {
  describe('providerIdsに応じた連絡先を返す', () => {
      // contextを使わずitに条件を記載している
      it('providerIdsにLINEが含まれている場合、LINEの問い合わせ先を返す', () => {
        // テストの実装を書く
      });
  });
});
```

### 構文解説

- target..テスト対象のメソッド
- describe…テスト対象メソッドのふるまい説明
- (context…検証したいふるまいに前提条件があればcontextとして記載)
- it…期待値

### 背景

- テストコードは上から下に読みやすい形式で書きたいため
    - itに条件まで記載すると認知負荷が高まってしまう
- テストコードをtargetやcontextの観点で構造化することで、各テストケースの目的や前提条件がより明確となり、全体の可読性と保守性が向上する