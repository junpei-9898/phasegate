# 論理設計計画: adr-documentation

> **Unit ID**: adr-documentation
> **作成日**: 2026-03-11
> **Wave**: 1（基盤構築）
> **モード**: 横断（Unit全体の論理設計）
> **対応ストーリー**: US-020, US-021, US-022

---

## 1. スコープ

### 対象Unit
- **adr-documentation** -- ADRテンプレート整備、初期10件ADR作成、ステータス管理

### 対象ストーリー
| Story ID | タイトル | 概要 |
|----------|---------|------|
| US-020 | ADRテンプレートの整備 | テンプレート構造定義、ファクトリによるADR生成 |
| US-021 | 初期10件ADRの作成 | 既存の意思決定を形式知化し10件のADRファイルを生成 |
| US-022 | ADRステータス管理の付与 | フロントマターによるステータス管理、状態遷移制御、バリデーション |

### 設計対象の層
| 層 | 対象 | 理由 |
|----|------|------|
| Domain | 対象 | 集約・エンティティ・値オブジェクト・ドメインルールの実装設計 |
| UseCase | 対象 | ADR作成・一覧取得・ステータス遷移・バリデーション等のユースケース設計 |
| Controller（CLI） | 対象 | CLIコマンドまたはプログラマティックAPIとしてのエントリポイント設計 |
| Infrastructure（アダプター） | 対象 | ファイルシステムリポジトリ、YAMLフロントマターパーサーの実装設計 |
| DB | **対象外** | ファイルシステムベース（Markdownファイル）のためDB層は不要 |
| BFF / Frontend | **対象外** | CLIツールキットのためUI層は不要 |

---

## 2. 設計方針

### 2.1 アーキテクチャ層の定義

ヘキサゴナルアーキテクチャ（ポート&アダプター）に準拠し、以下の4層構成とする。

```
Controller (Primary Adapter)
    ↓
UseCase (Application Service)
    ↓
Domain (Entity / Value Object / Aggregate)
    ↑
Port (Interface) ← Infrastructure (Secondary Adapter)
```

**依存方向**: Domain → Port → UseCase → Controller。Infrastructure は Port を実装し、UseCase から Port 経由で利用される。Domain層は外部への依存を一切持たない。

### 2.2 アーキテクチャ層の根拠

| 層 | 根拠 |
|----|------|
| Domain | ADRの状態遷移ルール（INV-1~INV-8）、値オブジェクトのバリデーション等、ビジネスロジックの中心。ドメインモデルの豊かさを最優先とするアーキテクチャ哲学に基づき、集約ルートに振る舞いを集中させる |
| UseCase | 集約の取得・永続化の調整役。ドメインロジックをUseCase層に漏出させない |
| Controller | ユースケースの呼び出しと入出力変換を担うエントリポイント。薄いレイヤーとして設計 |
| Infrastructure | ファイルシステムI/OとYAMLパース。ドメイン知識を持たず、Portインターフェースを忠実に実装 |

### 2.3 技術スタックの前提

| 項目 | 技術 |
|------|------|
| 言語 | TypeScript |
| リンター/フォーマッター | Biome |
| テストフレームワーク | Vitest |
| パッケージマネージャ | pnpm |
| CI/CD | GitHub Actions |
| 設定ファイル | phasegate.config.json (JSON) |
| YAMLパース | gray-matter（統合契約・ドメインモデルで言及） |

### 2.4 ディレクトリ構成方針

```
src/units/adr-documentation/
├── domain/
│   ├── entities/          # ADR集約ルート
│   ├── value-objects/     # AdrId, AdrStatus, AdrFrontMatter, AdrBody, SupersededByRef, AdrFilePath
│   └── ports/             # AdrRepository, AdrFrontMatterParser
├── use-cases/             # CreateAdr, ListAdrs, ChangeAdrStatus, ValidateAdrFrontMatter 等
├── controllers/           # CLIエントリポイントまたはプログラマティックAPI
└── infrastructure/        # FileSystemAdrRepository, YamlFrontMatterParser
```

---

## 3. 設計内容サマリー

### 3.1 Domain層

- **ADR集約ルート**: ドメインモデル定義に基づく集約。ステータス遷移ロジック（approve, deprecate, supersede, repropose）を集約内部に持たせる。`createFromTemplate`静的ファクトリメソッドでテンプレートベースの生成を実現
- **値オブジェクト群**:
  - `AdrId`: 正の整数、ゼロパディング3桁表示（`toDisplayString()`）、等価性比較
  - `AdrStatus`: 列挙型（Proposed/Accepted/Deprecated/Superseded）。`canTransitionTo(target)`メソッドで遷移可否を判定
  - `AdrFrontMatter`: title, status, date, supersededByを保持。不変条件（INV-3, INV-4, INV-7）をコンストラクタで検証
  - `AdrBody`: context, decision, consequences, alternativesを保持。必須フィールドのバリデーション（INV-6）
  - `SupersededByRef`: 後継ADR参照。successorIdの保持
  - `AdrFilePath`: `docs/ADR/{NNN}-{kebab-case-title}.md`形式のパス生成。静的ファクトリ`generateFrom(id, title)`
- **不変条件**: INV-1~INV-8をドメイン層で強制。違反時はドメインエラーをスロー
- **ドメインエラー**: `InvalidAdrStatusTransitionError`, `InvalidAdrIdError`, `InvalidAdrBodyError`, `InvalidAdrFrontMatterError` 等を定義

### 3.2 UseCase層

- **CreateAdrUseCase**: 次のIDを採番し、テンプレートからADRを生成して永続化。US-020の中核
- **ListAdrsUseCase**: 全ADRを一覧取得。US-021での初期ADR作成確認やステータス管理に使用
- **FindAdrByIdUseCase**: 指定IDのADRを取得
- **ApproveAdrUseCase**: 指定ADRをProposed→Acceptedへ遷移して永続化。US-022
- **DeprecateAdrUseCase**: 指定ADRをDeprecatedへ遷移して永続化。US-022
- **SupersedeAdrUseCase**: 指定ADRをSupersededへ遷移（後継ADRの存在確認含む）して永続化。US-022
- **ReproposeAdrUseCase**: Deprecated→Proposedの例外的遷移。US-022
- **ValidateAllAdrFrontMattersUseCase**: 全ADRのフロントマター整合性を検証。US-022のバリデーションテスト対応

各UseCaseはPort（AdrRepository）に依存し、ドメインロジックは集約に委譲する。UseCaseは調整役に徹する。

### 3.3 Controller層

- **プログラマティックAPI方式**: 本UnitはCLIコマンドを直接公開せず（統合契約のCLIコマンド一覧にadr-documentation固有のコマンドがない）、他Unit（harness-dx等）やスキル（スクリプト）から呼び出されるプログラマティックAPIとして設計
- **エントリポイント**: 各UseCaseを束ねるファサード的なモジュール。入力のバリデーション（プリミティブ型→値オブジェクト変換）と出力のシリアライズを担当
- **DTOの定義**: Controller層で受け取る入力DTO（CreateAdrInput, ChangeStatusInput等）と出力DTO（AdrOutput等）を定義し、ドメインオブジェクトの外部露出を防止

### 3.4 Infrastructure層

- **FileSystemAdrRepository**: AdrRepositoryポートの実装
  - `findById`: ファイルパスパターン`docs/ADR/{NNN}-*.md`でファイルを検索し、パース
  - `findAll`: `docs/ADR/`ディレクトリの全`.md`ファイル（template.md除外）をパースして返却
  - `save`: ADR→Markdownファイル（YAMLフロントマター+本文）のシリアライズと書き出し
  - `nextId`: 既存ADRファイルから最大番号を特定し+1。ファイルが0件なら`001`
  - `exists`: ファイルパスパターンでファイルの存在確認
  - **依存**: `AdrFrontMatterParser`ポートを利用してYAMLフロントマター部分のパース/シリアライズを委譲
- **YamlFrontMatterParser**: AdrFrontMatterParserポートの実装
  - `parse`: Markdownテキストからgray-matterでYAMLフロントマターを抽出し、`AdrFrontMatter`値オブジェクトに変換
  - `serialize`: `AdrFrontMatter`値オブジェクトをYAML形式文字列に変換
- **Markdownシリアライザ**: ADR本文（AdrBody）をMarkdownセクション構造（`## Context`, `## Decision`, `## Consequences`, `## Alternatives`）との双方向変換

---

## 4. QA（不明点・確認事項）

### [Question] Q1: Controller層の公開形態 -- CLIコマンドかプログラマティックAPIか

統合契約のCLIコマンド一覧にadr-documentation固有のコマンドが存在しない。本UnitのController層は、他Unitやスキルから呼び出されるプログラマティックAPI（TypeScript関数/クラスのexport）として設計する想定で問題ないか。それとも、将来的なCLI対応（例: `harness:adr create`, `harness:adr status`）を見据えたCLIアダプターも設計すべきか。

**推奨案:** 現時点ではプログラマティックAPI方式とし、CLIアダプターはYAGNI原則に基づき設計しない。将来CLIが必要になった場合はController層にCLIアダプターを追加する形で拡張可能な設計とする。

[Answer]
推奨案にしましょう

---

### [Question] Q2: 初期10件ADRの生成方法 -- US-021の実装アプローチ

US-021「初期10件ADRの作成」では、10件のADRコンテンツ（タイトル・コンテキスト・決定・結果・代替案）をどのように供給するか。以下のいずれかを想定:
1. **ハードコードされたシードデータ**: TypeScriptの定数配列として10件分のADRコンテンツを定義し、CreateAdrUseCaseを10回呼び出すスクリプト
2. **外部入力ファイル**: JSONやYAMLの入力ファイルから読み込み
3. **手動作成**: テンプレートを使って人間が手動で10件作成（本Unitはテンプレートの提供のみ）

**推奨案:** 方式1（シードデータ方式）。10件の初期ADRコンテンツをTypeScript定数として定義し、`SeedInitialAdrsUseCase`（または専用スクリプト）で一括生成する。これにより再現性と自動テストが可能。

[Answer]
推奨案にしましょう

---

### [Question] Q3: gray-matterライブラリの利用可否

ドメインモデルでYamlFrontMatterParserの実装として「gray-matter等のライブラリ」が言及されている。pnpmの依存としてgray-matterを追加してよいか。あるいは、外部依存を最小化するために自前でYAMLフロントマターのパースを実装すべきか。

**推奨案:** gray-matterを利用する。YAMLフロントマターのパースは定型処理であり、自前実装はバグリスクが高い。ただしポートを介して利用するため、将来のライブラリ差し替えは容易。

[Answer]
推奨案にしましょう

---

### [Question] Q4: docs/ADR/template.mdの扱い

Unit定義で「ADRテンプレート」が言及されている。`docs/ADR/template.md`はファイルとして実際に生成・配置するか、それともドメインのファクトリ（`createFromTemplate`）のロジックとしてのみ存在するか。

**推奨案:** 両方。`docs/ADR/template.md`を物理ファイルとして配置し（人間が手動でADRを作る際のリファレンスとして）、加えてドメインのファクトリメソッドでもテンプレート構造をプログラム的に再現する。FileSystemAdrRepositoryの`findAll`ではtemplate.mdを除外する。

[Answer]
推奨案にしましょう

---

### [Question] Q5: SupersededByRefの参照先存在チェックのタイミング

ドメインモデルのINV-8「SupersededByRefの参照先ADRが存在すること」について、この検証はドメイン層で行うか（集約のsupersedeメソッド内）、UseCase層で行うか（SupersedeAdrUseCaseでリポジトリ確認後に集約メソッドを呼ぶ）。

**推奨案:** UseCase層で検証する。リポジトリへのアクセスが必要なため、ドメイン層で直接実行するとPortへの依存が生じ、ヘキサゴナルアーキテクチャの依存方向に違反する。UseCaseで`repository.exists(successorId)`を確認し、存在しなければドメインエラーをスローする。集約のsupersedeメソッドは「successorIdが有効である」ことを前提として受け取る。

[Answer]
推奨案にしましょう

---

## 5. 前提条件・リスク

### 前提条件
- ドメインモデル（`docs/product/construction/adr_documentation/domain_model.md`）が確定済みであること -- 確認済み
- 統合契約（`docs/product/units/integration_contract.md`）のADRフロントマター仕様（Section 4.8）が確定済みであること -- 確認済み
- 本Unitは外部依存なし（Wave 1基盤Unit）のため、他Unitの設計完了を待つ必要がない
- ADRファイルの配置先は`docs/ADR/`固定（phasegate.config.jsonで変更不可）

### リスク
| # | リスク | 影響 | 緩和策 |
|---|--------|------|--------|
| R-1 | gray-matterのYAMLパース結果がドメインモデルの期待する型と一致しない可能性 | フロントマターの型変換エラー | YamlFrontMatterParser内で厳密な型変換・バリデーションを実施。ユニットテストで各パターンを網羅 |
| R-2 | ADRファイル名のkebab-case変換ルールが曖昧（特殊文字、日本語タイトル等） | ファイルパス生成の不整合 | AdrFilePathの生成ルールを明確に定義し、エッジケースのテストを充実させる。英数字・ハイフンのみ許可とする |
| R-3 | ファイルシステムの同時アクセス（複数プロセスからのADR操作） | データ不整合 | v1ではシングルプロセス前提とし、同時アクセス制御は実装しない。将来必要になった場合はファイルロック機構を追加 |
| R-4 | 初期10件ADRのコンテンツが本設計時点で未確定 | US-021の実装に遅延 | Q2の回答に基づき、コンテンツ定義を早期に確定させる |
