# 論理設計: attestation

## WI-224 Signed Attestation PoC (unsigned-poc mode)

<!-- @work-item-id WI-224 -->

---

## 10. WI-286: SHA-256 public facade

<!-- @work-item-id WI-286 -->

@story-id H17-01

### 10.1 Public surface

root `attestation/index.ts`は次だけを追加公開する。

```text
Sha256Capability
Sha256DigestString
hashUtf8(capability, text)
createSha256Capability()
```

`Digest`、`ContentHasherPort`、`NodeCryptoSha256Capability`、`NodeCryptoContentHasherAdapter`はpublic barrelからexportしない。

### 10.2 Dependency flow

```text
createSha256Capability()
  -> NodeCryptoSha256Capability.hashBytes(Uint8Array)
  -> plain sha256:<hex>

createAttestationModule()
  -> one Sha256Capability instance
  -> NodeCryptoContentHasherAdapter
  -> ContentHasherPort.sha256(string): Digest
```

既存`NodeCryptoContentHasherAdapter`の`createHash("sha256")` callを`NodeCryptoSha256Capability`へ移動し、adapterはUTF-8 helperとlocal VO変換だけを持つ。call site総数は増やさない。

### 10.3 Implemented file changes

| Path | Responsibility |
|---|---|
| `application/ports/sha256-capability.ts` | plain public contract / UTF-8 helper |
| `infrastructure/adapters/node-crypto-sha256-capability.ts` | moved Node.js SHA-256 primitive |
| `infrastructure/adapters/node-crypto-content-hasher-adapter.ts` | internal `Digest` adapter |
| `composition-root.ts` | public factoryとinternal wiring |
| `index.ts` | supported public exports |

world-model sourceはWM-06では変更せず、後続WIがroot barrelだけをimportしてconsumer-owned portへadaptする。

### 10.4 Implementation status

WM-06でpublic contract / factory / concrete provider / internal adapter wiringを実装した。attestation public barrelはplain surfaceだけを公開し、既存record / produce / verify contractを変更していない。World consumer adapterは後続WIのままである。

attestation Unit は `phasegate:ci-check` の結果を content-addressed な attestation record として生成・検証する。PoC では unsigned-poc モードのみを実装し、ドキュメント自身の content digest（`attestationDigest`）で **INTEGRITY（改竄検知）** を証明する。**AUTHENTICITY（発行者の真正性）は証明しない**。真の ed25519 署名は `signature.mode: "signed"` として後から差し込む前提で、record format に `signature.mode` discriminator を持たせる。attest は opt-in の独立コマンドであり、`phasegate:ci-check` の経路には注入しない。

@story-id H16-01
@story-id H16-02
@work-item-id WI-224
> **作成日**: 2026-07-05
> **対応ストーリー**: H16-01, H16-02
> **モード**: Unit横断設計（Phase 2 / 手1 signed attestation PoC）
> **前提ドキュメント**: `domain_model.md`（同ディレクトリ）, `docs/product/user_stories.md`（H16-01, H16-02）

---

## 1. アーキテクチャ概要

### 1.1 層構成と責務

| 層 | 責務 | 依存先 |
|----|------|--------|
| domain | `AttestationRecord` 集約、値オブジェクト（Digest / ValidatorOutcome / GranularityClaim / SignatureBlock）、不変条件、canonical 直列化、GranularityDerivationService、ContentHasherPort 定義 | なし |
| application | attest / verify のユースケース、DTO 変換、gate 結果取得・永続化・source digest 取得の調停、GateResultSourcePort / AttestationRepositoryPort 定義 | domain |
| infrastructure | sha256 計算（node:crypto）、source ファイル digest、ci-check subprocess 実行、attestation ファイル read/write | domain, application |
| presentation | CLI 引数解釈、UseCase 呼び出し、メッセージ整形、終了コード決定、composition root | application, domain |

設計原則:

- `domain ← application ← infrastructure`
- `domain ← application ← presentation`
- Domain 層は Node.js API、`crypto`、`child_process`、CLI 入出力に依存しない
- Application 層は集約を直接外へ返さず、`AttestationDocument` DTO へ変換する
- attestation domain は harness-api の `CiCheckResult` 型に依存しない。gate 結果は `GateResultSourcePort` が返す plain DTO 経由で受け取る（black-box observation）

### 1.2 依存方向

```text
                    ┌────────────────────────────────────────┐
                    │ presentation                           │
                    │ CLI handlers / argv / exitCode / root  │
                    └──────────────────┬─────────────────────┘
                                       │
                                       v
                    ┌────────────────────────────────────────┐
                    │ application                            │
                    │ usecases / DTO / mapper                 │
                    │ GateResultSourcePort                    │
                    │ AttestationRepositoryPort               │
                    └───────────────┬───────────────┬────────┘
                                    │               │
                                    v               ^
                    ┌────────────────────────────────────────┐
                    │ domain                                 │
                    │ AttestationRecord / VO / service       │
                    │ ContentHasherPort                      │
                    └───────────────^───────────────^────────┘
                                    │               │
                    ┌───────────────┴───────────────┴────────┐
                    │ infrastructure                         │
                    │ node:crypto / fs / child_process       │
                    └────────────────────────────────────────┘
```

- infrastructure は domain / application のポートを実装するが business rule は持たない
- presentation は application を経由せずに domain 操作を行わない
- `ContentHasherPort` は domain に置く（digest は INV-4/INV-5 の一部）。`GateResultSourcePort` / `AttestationRepositoryPort` は集約の不変条件に関与しない調停用ポートのため application に置く

### 1.3 ディレクトリ構成（全ファイル一覧）

以下は本 Unit の実装で作成される **全ファイル**。後続実装フェーズの書き込みはこの一覧に事前宣言される。

```text
scripts/harness/attestation/
├── domain/
│   ├── value-objects/
│   │   ├── digest.ts
│   │   ├── validator-outcome.ts
│   │   ├── granularity-claim.ts
│   │   └── signature-block.ts
│   ├── entities/
│   │   └── attestation-record.ts
│   ├── ports/
│   │   └── content-hasher-port.ts
│   └── services/
│       ├── granularity-derivation-service.ts
│       └── ac-bound-scope-service.ts        # WI-227: acBoundScope 導出（純粋・決定論）
├── application/
│   ├── dto/
│   │   ├── attestation-document.ts
│   │   ├── produce-attestation-input.ts
│   │   ├── verify-attestation-input.ts
│   │   └── verify-attestation-output.ts
│   ├── ports/
│   │   ├── gate-result-source-port.ts
│   │   ├── attestation-repository-port.ts
│   │   ├── source-digester-port.ts
│   │   ├── matrix-source-port.ts            # WI-227: acBoundScope 導出用 matrix 供給
│   │   └── ac-bound-allowlist-port.ts       # WI-227: acBoundStories allowlist 供給
│   ├── usecases/
│   │   ├── produce-attestation-usecase.ts
│   │   └── verify-attestation-usecase.ts
│   └── mappers/
│       └── attestation-record-mapper.ts
├── infrastructure/
│   └── adapters/
│       ├── node-crypto-content-hasher-adapter.ts
│       ├── file-system-source-digester-adapter.ts
│       ├── ci-check-gate-result-adapter.ts
│       ├── file-system-attestation-repository-adapter.ts
│       ├── file-system-matrix-source-adapter.ts    # WI-227: MatrixSourcePort 実装
│       └── config-ac-bound-allowlist-adapter.ts    # WI-227: AcBoundAllowlistPort 実装
├── presentation/
│   └── handlers/
│       ├── attest-handler.ts
│       └── verify-attestation-handler.ts
├── composition-root.ts
└── index.ts
```

補足:
- `main.ts` への `phasegate:attest` / `phasegate:verify-attestation` コマンド配線は本 Unit のスコープ外（後続フェーズ）。本 Unit は composition root と handler までを所有する
- `index.ts` は composition root と公開 handler / 型を再エクスポートする Unit の公開境界
- **実装で追加された application ポート**: `application/ports/source-digester-port.ts`（`SourceDigesterPort.digestFile(path): Promise<Digest>`）。verify 時にパスから source を再ハッシュするために必要（`ContentHasherPort` は与えられた string/Buffer をハッシュするだけでパスを解決しないため、パスベースの再計算には別ポートが要る）。実体は §5.2 `FileSystemSourceDigesterAdapter` が実装する
- **ドメイン例外は独立 `errors/` ディレクトリを持たず、送出元ファイルに inline 定義した**（§2.4 の errorCode 割当は不変）:
  - `InvalidDigestError`（`L1-050`）→ `domain/value-objects/digest.ts`
  - `AttestationInvariantError`（`L1-051`）→ `domain/entities/attestation-record.ts`
  - `UnsupportedSignatureModeError`（`L1-052`）→ `domain/value-objects/signature-block.ts`
  - `MalformedAttestationError`（`L1-053`）→ `application/mappers/attestation-record-mapper.ts`

### 1.4 主要な論理構造

#### 1.4.1 canonicalization / determinism 契約（load-bearing）

`attestationDigest` は次の canonical payload 上で算出する。この規則が record format の中核契約であり、生成（H16-01）と検証（H16-02）で完全一致していなければならない。

1. attestation document から **`signature` ブロック全体** を除去する
2. `metadata` から **volatile フィールド `producedAt` と `gitCommit`** を除去する（`producer` は残す。これは pkg version 由来で決定論的）
3. 残った document を **canonical JSON** へ直列化する:
   - オブジェクトのキーは **昇順ソート**（再帰的に全ネスト）
   - **空白・改行を一切含まない**（`JSON.stringify` の separators を最小化した等価表現）
   - 配列は順序保持
4. その UTF-8 バイト列の sha256 を計算し `sha256:<64hex>` として `signature.attestationDigest` に格納する

`metadata.producedAt`（ISO-8601）と `metadata.gitCommit` は人間のために記録するが digest からは除外する（同じ入力・同じ gate 結果なら実行時刻や記録タイミングに依らず同一 digest になる）。

**acBoundScope は canonical payload に INCLUDE される（WI-227）**: トップレベルの `acBoundScope`（`string[]`, 昇順ソート済み）は step1-2 の除去対象ではないため canonical payload に残り、`attestationDigest` でカバーされる。したがって acBoundScope を改竄すると attestationDigest 再計算が不一致となり verify で検出される（改竄検知）。加えて verify は acBoundScope を stored matrix + config allowlist から**再導出**して格納値と比較する（anti-laundering、§4.5）。producedAt / gitCommit のみが異なる 2 回の実行では acBoundScope も含めて digest がバイト一致する（決定論）。

#### 1.4.2 inputDigest の決定論

`inputs.inputDigest` は `inputs.sources` から算出する:

1. `sources` を **`path` 昇順で安定ソート**
2. `[{ path, digest }]` の canonical JSON（§1.4.1 と同じ規則）を作る
3. その sha256 を `sha256:<64hex>` として格納する

`inputs.sources` は `phasegate.config.json` と `.harness/requirement-test-matrix.json` の sha256、および git commit SHA を入力構成に反映する。git commit SHA は `sources` の1エントリとして（`path: "git:HEAD"`, `digest: "sha256:<sha を content とした digest>"` 等の一貫した表現で）取り込み、`inputDigest` に含める。

#### 1.4.3 record format（`phasegate-attestation/v1`）

```jsonc
{
  "schemaVersion": "phasegate-attestation/v1",
  "predicateType": "https://phasegate.dev/attestation/gate-run/v1",
  "subject": {
    "command": "phasegate:ci-check",
    "gateResult": "pass",                 // "pass" | "fail" (CiCheckResult.allPassed をミラー)
    "validatorSet": [ { "validatorId": "L3-001", "passed": true, "skipped": false } ]
  },
  "inputs": {
    "digestAlgorithm": "sha256",
    "sources": [ { "path": "phasegate.config.json", "digest": "sha256:<64hex>" } ],
    "inputDigest": "sha256:<64hex>"       // sorted sources[] 上の決定論的 hash
  },
  "granularity": {
    "traceability": {
      "validator": "L3-004", "level": "file",
      "claim": "...", "knownLimitations": [ "L3-004 traceability is FILE-LEVEL, not per-AC..." ]
    }
  },
  "acBoundScope": [ "HF2-05" ],           // WI-227: 実際に ac-bound かつ L3-005 スコープ内で pass した story-id（昇順・machine-readable）。granularity.level とは独立（level は "file" のまま）
  "metadata": { "producedAt": "<ISO8601>", "producer": "phasegate-attestation/<pkgVersion>", "gitCommit": "<sha|null>" },
  "signature": { "mode": "unsigned-poc", "attestationDigest": "sha256:<64hex>", "algorithm": null, "keyId": null, "value": null }
}
```

#### 1.4.4 CLI サーフェス

`phasegate:attest`:

| フラグ | 既定 | 意味 |
|--------|------|------|
| `--out <path>` | `.harness/attestation.json` | record 出力先 |
| `--require-pass` | off | `gateResult != "pass"` なら record を一切出力せず exit 1 |
| `--json` | off | 生成 document を stdout にもエコー |
| `--mode <unsigned-poc\|signed>` | `unsigned-poc` | `signed` は "not yet implemented" として usage error |

終了コード: `0` 成功 / `1` `--require-pass` 下で gate 失敗 / `2` usage error。

`phasegate:verify-attestation <file>`:

| フラグ | 既定 | 意味 |
|--------|------|------|
| `--json` | off | 各チェック結果を機械可読に出力 |

機械的チェック: (1) schema/shape 妥当 / (2) mode サポート対象 / (3) canonical payload 上で `attestationDigest` 再計算 == 格納値 / (4) `inputs.sources[].digest` を現在ファイルから再計算 == 格納値 / (5) `granularity` を `subject.validatorSet` から再導出 == 格納値。
終了コード: `0` 全合格 / `1` いずれか mismatch / `2` 不在・malformed・非対応 mode。

---

## 2. Domain層設計

### 2.1 集約ルート: AttestationRecord

#### 2.1.1 集約責務

`AttestationRecord` は attestation ドキュメント1件を整合性境界として扱う単一集約。責務は以下:

1. `subject` / `inputs` / `granularity` / `signature` を保持し、不変条件（INV-1〜INV-7）を保証する
2. canonical payload を決定論的に直列化する（§1.4.1）
3. `ContentHasherPort` を用いて `attestationDigest` / `inputDigest` を算出し、record を封印する

#### 2.1.2 属性一覧

| 属性 | 型 | 必須 | 説明 |
|------|----|------|------|
| `schemaVersion` | `"phasegate-attestation/v1"` | Yes | スキーマ版 |
| `predicateType` | `string` | Yes | predicate URI |
| `subject` | `SubjectSection` | Yes | `{ command, gateResult, validatorSet: ValidatorOutcome[] }` |
| `inputs` | `InputsSection` | Yes | `{ digestAlgorithm, sources: {path, digest:Digest}[], inputDigest:Digest }` |
| `granularity` | `{ traceability: GranularityClaim }` | Yes | 検査粒度の主張 |
| `metadata` | `MetadataSection` | Yes | `{ producedAt, producer, gitCommit }`。volatile |
| `signature` | `SignatureBlock` | Yes | mode discriminator を持つ署名ブロック |

#### 2.1.3 メソッド一覧

##### `static create(props: AttestationRecordProps): AttestationRecord`

- 入力: `subject`, `inputs`（digest 済み）, `granularity`, `metadata`, `signature`
- 出力: `AttestationRecord`
- 例外: `AttestationInvariantError`, `InvalidDigestError`
- 検証: INV-1, INV-2, INV-3, INV-6, INV-7

処理フロー:
1. `subject.gateResult` が `subject.validatorSet` の allPassed 規則（`every(passed||skipped)`）と一致することを検証（INV-1）
2. `granularity` が `GranularityDerivationService.derive(validatorSet)` と一致することを検証（INV-3）
3. `signature.mode == "unsigned-poc"` なら `algorithm`/`keyId`/`value` が `null` を検証（INV-6）
4. `signature.attestationDigest` の present iff mode set（INV-2）
5. `AttestationRecord` を返す

##### `computeInputDigest(hasher: ContentHasherPort): Digest`

- §1.4.2 の規則で `sources` から `inputDigest` を算出

##### `toCanonicalPayload(): object`

- §1.4.1 の step1-3 を適用した plain object を返す（signature 除去 + volatile metadata 除去 + キーソート済み構造）

##### `computeAttestationDigest(hasher: ContentHasherPort): Digest`

- `toCanonicalPayload()` を canonical JSON 直列化し `hasher.sha256()` にかける

##### `seal(hasher: ContentHasherPort): AttestationRecord`

- `computeAttestationDigest()` を `signature.attestationDigest` に反映した新しい record を返す（INV-4 を満たす封印済み record）

##### `equals(other): boolean`

- 全セクション値等価で判定

#### 2.1.4 集約不変条件

| ID | 不変条件 | 実装箇所 |
|----|---------|---------|
| INV-1 | `gateResult=="pass"` iff `validatorSet.every(passed\|\|skipped)` | `AttestationRecord.create()` |
| INV-2 | `attestationDigest` present iff `signature.mode` set | `AttestationRecord.create()` |
| INV-3 | `granularity` == `GranularityDerivationService.derive(validatorSet)` | `AttestationRecord.create()` |
| INV-4 | `attestationDigest` == canonical payload の sha256 | `seal()` / 検証時再計算 |
| INV-5 | `inputDigest` == sorted sources の sha256 | `computeInputDigest()` |
| INV-6 | unsigned-poc のとき algorithm/keyId/value == null | `SignatureBlock.unsignedPoc()` / `create()` |
| INV-7 | Digest は `sha256:` + 64hex | `Digest.create()` |

### 2.2 値オブジェクト群

全 VO は immutable、生成は factory 経由、`equals(other)` は全属性一致で判定。

#### 2.2.1 Digest

| 属性 | 型 | 説明 |
|------|----|------|
| `value` | `string` | `sha256:<64hex>` |

生成ルール: `sha256:` prefix + 64桁 hex 以外は `InvalidDigestError`。
メソッド: `static create(raw)`, `static fromSha256Hex(hex)`, `equals()`, `toString()`。

#### 2.2.2 ValidatorOutcome

| 属性 | 型 | 説明 |
|------|----|------|
| `validatorId` | `string` | 例 `L3-004` |
| `passed` | `boolean` | 合格 |
| `skipped` | `boolean` | skip |

生成ルール: `validatorId` 空文字不可。`skipped` 未指定は `false` に正規化。
メソッド: `static create(raw)`, `isGreen()`（`passed||skipped`）, `equals()`。

#### 2.2.3 GranularityClaim

| 属性 | 型 | 説明 |
|------|----|------|
| `validator` | `string` | 対象 validatorId（例 `L3-004`） |
| `level` | `"file" \| "ac"` | 検査粒度 |
| `claim` | `string` | 粒度の説明文 |
| `knownLimitations` | `readonly string[]` | 既知制約テキスト群 |

生成ルール: `level` は列挙値のみ。`knownLimitations` 順序保持。
メソッド: `static create(raw)`, `equals()`。

#### 2.2.4 SignatureBlock

| 属性 | 型 | 説明 |
|------|----|------|
| `mode` | `"unsigned-poc" \| "signed"` | discriminator |
| `attestationDigest` | `Digest` | canonical payload digest |
| `algorithm` | `string \| null` | unsigned-poc では null |
| `keyId` | `string \| null` | unsigned-poc では null |
| `value` | `string \| null` | unsigned-poc では null（署名値） |

メソッド: `static unsignedPoc(digest: Digest)`（algorithm/keyId/value を null で構築）, `equals()`。

### 2.3 ドメインサービス

#### 2.3.1 GranularityDerivationService

validator set + 静的 known-limitations registry から `GranularityClaim` を機械導出する純粋サービス。

##### `derive(validatorSet: readonly ValidatorOutcome[]): GranularityClaim`

処理フロー:
1. registry から traceability 検査に対応する validatorId（`L3-004`）を引く
2. `L3-004` が validator set に含まれるか確認する
3. `GranularityClaim` を `{ validator: "L3-004", level: "file", claim: <traceability の file-level 説明>, knownLimitations: [<"L3-004 traceability is FILE-LEVEL, not per-AC — a green means each AC has >=1 referencing test FILE, not that each AC is individually asserted">, ...] }` として構築する
4. 生成時（H16-01）と検証時（H16-02 anti-laundering 再導出）で同一結果を返す

known-limitations registry は validatorId → 制約テキストの静的マップ。domain 内定数または Infrastructure から供給する参照データとする（§5.x で adapter 化は不要、静的 domain 定数で足りる）。

### 2.4 ドメイン例外定義

attestation は Domain/構造を担う層であるため、`errorCode` は横断決定事項 §3 に従い `L1-xxx` 系（本 Unit 採番帯 `L1-050`〜）を割り当てる。

| 例外 | errorCode | 発生条件 | 主な送出箇所 |
|------|-----------|----------|--------------|
| `InvalidDigestError` | `L1-050` | `sha256:` + 64hex に適合しない digest | `Digest.create()` |
| `AttestationInvariantError` | `L1-051` | INV-1/2/3/6 のいずれかに違反 | `AttestationRecord.create()` |
| `UnsupportedSignatureModeError` | `L1-052` | 未対応 mode（`signed`）の生成/検証要求 | `SignatureBlock` / usecase |
| `MalformedAttestationError` | `L1-053` | verify 時に shape/型が不正 | `AttestationRecordMapper` |

実装規約: 全例外は `errorCode` を必須属性として保持し、Application 層は `errorCode` を変更せず `HarnessError` / CLI 出力へ伝搬する。

---

## 3. Domain層ポート設計

### 3.1 ContentHasherPort

```ts
export interface ContentHasherPort {
  sha256(content: string | Buffer): Digest;
}
```

| メソッド | 入力 | 出力 | 用途 |
|---------|------|------|------|
| `sha256` | `string \| Buffer` | `Digest` | canonical payload / source content の sha256 を `sha256:<64hex>` として返す |

配置理由: `attestationDigest` / `inputDigest` は集約の不変条件 INV-4/INV-5 の一部であり、digest 計算能力は domain の関心事。実体（`node:crypto`）は Infrastructure に隔離する。

> **注**: `GateResultSourcePort` と `AttestationRepositoryPort` は集約不変条件に関与しない調停用ポートのため domain ではなく **application 層** に定義する（§4.2 / §4.3）。

---

## 4. Application層設計

### 4.1 DTO一覧

| DTO | 型概要 | 用途 |
|-----|--------|------|
| `AttestationDocument` | record format 全体の plain object 表現（§1.4.3） | ファイル入出力・stdout エコー・mapper の境界 |
| `ProduceAttestationInput` | `{ out: string; requirePass: boolean; emitJson: boolean; mode: "unsigned-poc" \| "signed" }` | attest usecase 入力 |
| `VerifyAttestationInput` | `{ filePath: string; emitJson: boolean }` | verify usecase 入力 |
| `VerifyAttestationOutput` | `{ ok: boolean; checks: { schema, mode, attestationDigest, inputHashes, granularity: boolean }; mismatches: string[] }` | verify 結果 |

### 4.1.1 AttestationRecordMapper

**ファイル**: `scripts/harness/attestation/application/mappers/attestation-record-mapper.ts`

- `toDocument(record: AttestationRecord): AttestationDocument` — 集約を plain object へ射影（VO をプリミティブ展開）
- `fromDocument(doc: unknown): AttestationRecord` — verify 時に外部 JSON を検証しつつ集約へ再構築。shape/型不正は `MalformedAttestationError`

### 4.2 GateResultSourcePort（application 所有）

```ts
export interface GateResultSourcePort {
  fetchGateResult(): Promise<{
    allPassed: boolean;
    validatorResults: readonly { validatorId: string; passed: boolean; skipped: boolean }[];
  }>;
}
```

配置理由: ci-check 結果の取得は subprocess 観測という調停であり集約不変条件に関与しない。black-box observation を差し替え可能にするため application ポートとする。

### 4.3 AttestationRepositoryPort（application 所有）

```ts
export interface AttestationRepositoryPort {
  write(path: string, doc: AttestationDocument): Promise<void>;
  read(path: string): Promise<unknown>;
}
```

配置理由: attestation ファイル I/O。集約不変条件に関与しない永続化調停のため application ポート。

### 4.3.1 SourceDigesterPort（application 所有）

```ts
export interface SourceDigesterPort {
  digestFile(path: string): Promise<Digest>;
}
```

**ファイル**: `scripts/harness/attestation/application/ports/source-digester-port.ts`

配置理由: `ContentHasherPort` は与えられた string/Buffer をハッシュするだけでパスを解決しない。source ファイル（config / requirement-test-matrix）と verify 時の現在ファイルは **パスから読み込んで再ハッシュ**する必要があるため、パス→`Digest` を担う別ポートを application に置く。集約不変条件に関与しないファイル観測の調停であり application ポートとする。実体は §5.2 `FileSystemSourceDigesterAdapter`。

> 下記 §4.4 / §4.5 の `sourceDigester` 依存はこの `SourceDigesterPort`（`ContentHasherPort` ではない）を指す。

### 4.4 ProduceAttestationUseCase

**責務**: gate 結果取得 → source digest 取得 → granularity 導出 → 集約構築 → 封印 → 出力。

コンストラクタ依存:
- `gateResultSource: GateResultSourcePort`
- `sourceDigester: ContentHasherPort` 経由の source digest（実体は §5.2 adapter）
- `hasher: ContentHasherPort`
- `repository: AttestationRepositoryPort`
- `granularityService: GranularityDerivationService`
- `mapper: AttestationRecordMapper`
- `matrixSource: MatrixSourcePort`（WI-227: acBoundScope 導出用 matrix）
- `allowlist: AcBoundAllowlistPort`（WI-227: acBoundStories allowlist）
- `acBoundScopeService: AcBoundScopeService`（WI-227）

入力: `ProduceAttestationInput`
出力: `Promise<{ document: AttestationDocument | null; exitCode: 0 | 1 | 2 }>`

処理フロー:
1. `mode == "signed"` なら "not yet implemented" として exitCode 2 で早期 return（record 出力なし）
2. `gateResultSource.fetchGateResult()` を実行し `validatorSet` と `gateResult`（allPassed → "pass"/"fail"）を組み立てる
3. `requirePass && gateResult != "pass"` なら record を一切生成/出力せず exitCode 1 で return
4. `inputs.sources` を `phasegate.config.json` / `.harness/requirement-test-matrix.json` の sha256 + git commit SHA から構築し、`inputDigest` を §1.4.2 で算出
5. `granularityService.derive(validatorSet)` で `GranularityClaim` を導出（level は "file" のまま。acBoundScope とは独立）
5b. **acBoundScope 導出（WI-227）**: `matrixSource` から matrix を取得、`allowlist` から acBoundStories を取得し、`acBoundScopeService.derive(matrix, allowlist)` で `string[]`（昇順）を得る。HF2-05 が genuinely ac-bound かつ allowlist 内なら `["HF2-05"]`
6. `metadata`（`producedAt=now`, `producer=phasegate-attestation/<pkgVersion>`, `gitCommit`）を組む
7. `AttestationRecord.create({ ..., acBoundScope })` → `seal(hasher)` で `attestationDigest` 確定（acBoundScope は canonical payload に含まれる）
8. `mapper.toDocument()` → `repository.write(out, doc)`。`emitJson` なら document を返して handler が stdout 出力
9. exitCode 0 で return

### 4.5 VerifyAttestationUseCase

**責務**: 既存 record を読み込み、機械的 5 チェックを再計算で行う。

コンストラクタ依存:
- `repository: AttestationRepositoryPort`
- `sourceDigester`（現在ファイルの sha256 計算）
- `hasher: ContentHasherPort`
- `granularityService: GranularityDerivationService`
- `mapper: AttestationRecordMapper`
- `matrixSource: MatrixSourcePort`（WI-227: acBoundScope 再導出用）
- `allowlist: AcBoundAllowlistPort`（WI-227）
- `acBoundScopeService: AcBoundScopeService`（WI-227）

入力: `VerifyAttestationInput`
出力: `Promise<{ output: VerifyAttestationOutput; exitCode: 0 | 1 | 2 }>`

処理フロー:
1. `repository.read(filePath)`。不在/parse 失敗は exitCode 2
2. `mapper.fromDocument()` で shape/型検証。不正は exitCode 2（`schema` check fail）
3. `signature.mode` が `unsigned-poc` 以外なら exitCode 2（`mode` check fail、`signed` は非対応）
4. canonical payload 上で `attestationDigest` 再計算 == 格納値（`attestationDigest` check）
5. `inputs.sources[].digest` を現在ファイルから再計算 == 格納値（`inputHashes` check）
6. `granularityService.derive(validatorSet)` == 格納 `granularity`（`granularity` check、anti-laundering）
6b. **acBoundScope 再導出（WI-227, anti-laundering）**: `inputs.sources` の（ハッシュ検証済み）matrix パスから matrix を取得（Q3）、`allowlist` から acBoundStories を取得し、`acBoundScopeService.derive(matrix, allowlist)` を再計算して格納 `acBoundScope` と比較（`acBoundScope` check）。matrix / allowlist が読めない・parse 不能なら acBoundScopeOk=false（fail-closed, Q2）
7. 4-6b のいずれか mismatch → exitCode 1、全合格 → exitCode 0
8. `emitJson` なら `VerifyAttestationOutput` を stdout に出力

> `VerifyAttestationChecks` に `acBoundScope: boolean` を追加し、`ok` にフォールドする。

### 4.6 acBoundScope 導出（WI-227 / H16-03）

**AcBoundScopeService（domain, 純粋・決定論）**

- `derive(matrix, allowlist: readonly string[]): string[]` — allowlist 内かつ matrix 上で全 linked AC が ≥1 の `binding:"ac"` ref を持つ story だけを昇順で返す。
- 資格条件は domain_model INV-8 に対応（option-a determinism: stored matrix + config allowlist から再導出可能）。
- `GranularityDerivationService` は一切変更しない。acBoundScope は `granularity.traceability.level`（"file" のまま）から独立した別次元の主張である。

**MatrixSourcePort / AcBoundAllowlistPort（application 所有）**

| ポート | メソッド | 責務 |
|--------|---------|------|
| `MatrixSourcePort` | `load(matrixFilePath?): Promise<Matrix>` | acBoundScope 導出用の requirement-test-matrix を供給（fail 時は throw、usecase 側が fail-closed 変換） |
| `AcBoundAllowlistPort` | `getAcBoundStories(): Promise<readonly string[]>` | config の `layers.L3.acBoundStories` を供給 |

実体は `FileSystemMatrixSourceAdapter`（§5.x）と `ConfigAcBoundAllowlistAdapter`（§5.x）。両 usecase（produce / verify）へ composition-root で配線する。

---

## 5. Infrastructure層設計

### 5.1 NodeCryptoContentHasherAdapter

**ファイル**: `adapters/node-crypto-content-hasher-adapter.ts`
実装対象ポート: `ContentHasherPort`
技術選定: `node:crypto` `createHash("sha256")`（installation の `node-crypto-hash-adapter.ts` をミラー、sha256）。
実装方針: `sha256(content)` は `Digest.create(\`sha256:${createHash("sha256").update(content).digest("hex")}\`)` を返す。

### 5.2 FileSystemSourceDigesterAdapter

**ファイル**: `adapters/file-system-source-digester-adapter.ts`
実装対象: source ファイルの sha256 digest 供給（ci-governance の `file-system-sha1-hasher-adapter.ts` をミラーするが **sha1 ではなく sha256**）。
技術選定: `node:fs/promises` + `node:crypto`。
実装方針: 相対/絶対パスを解決して `fs.readFile` し、`crypto.createHash("sha256")` で `Digest` を返す。git commit SHA は本 adapter または usecase 側で `git rev-parse HEAD` 相当を取得して source エントリ化する（subprocess）。

### 5.3 CiCheckGateResultAdapter

**ファイル**: `adapters/ci-check-gate-result-adapter.ts`
実装対象ポート: `GateResultSourcePort`
技術選定: `node:child_process`（agent-integration の `child-process-cli-executor-adapter.ts` の subprocess パターンをミラー）。
実装方針: `npx tsx <main.ts> phasegate:ci-check --json` を subprocess 実行し、stdout の JSON から `{ allPassed, validatorResults[] }` を抽出する。black-box observation であり ci-check の内部を import しない。timeout/非0 exit の扱いを adapter 内で吸収する。

### 5.4 FileSystemAttestationRepositoryAdapter

**ファイル**: `adapters/file-system-attestation-repository-adapter.ts`
実装対象ポート: `AttestationRepositoryPort`
技術選定: `node:fs/promises`, `node:path`。
実装方針: `write` は出力先ディレクトリを作成し `JSON.stringify(doc, null, 2) + "\n"` で書き出す。`read` は `readFile` + `JSON.parse`（parse 失敗はそのまま throw し usecase が exitCode 2 に変換）。

---

## 6. Presentation層設計

### 6.1 AttestHandler

**ファイル**: `presentation/handlers/attest-handler.ts`（harness-api の `ci-check-handler.ts` の output + exitCode スタイルをミラー）

入力: argv 由来の flags（`--out`, `--require-pass`, `--json`, `--mode`）
処理:
1. flags を `ProduceAttestationInput` に解釈（未知フラグは exitCode 2）
2. `ProduceAttestationUseCase.execute()` を呼ぶ
3. `emitJson` かつ document があれば canonical でない整形 JSON を stdout へ
4. `process.exitCode` に usecase の exitCode を設定

終了コード: `0` 成功 / `1` `--require-pass` 下で gate fail / `2` usage error（未知フラグ・`--mode signed`）。

### 6.2 VerifyAttestationHandler

**ファイル**: `presentation/handlers/verify-attestation-handler.ts`

入力: `process.argv` の位置引数 `<file>` + `--json`
処理:
1. `<file>` 不在なら usage error（exitCode 2）
2. `VerifyAttestationUseCase.execute()` を呼ぶ
3. `--json` なら `VerifyAttestationOutput` を stdout へ。human 出力時は各チェック結果と mismatch を整形表示
4. `process.exitCode` に usecase の exitCode を設定

終了コード: `0` 全合格 / `1` mismatch / `2` 不在・malformed・非対応 mode。

### 6.3 composition-root.ts

**ファイル**: `scripts/harness/attestation/composition-root.ts`（ci-governance の `composition-root.ts` をミラー）

`createAttestationModule()` は以下を組み立てて `{ attestHandler, verifyAttestationHandler }` を返す:
1. `NodeCryptoContentHasherAdapter`
2. `FileSystemSourceDigesterAdapter`
3. `CiCheckGateResultAdapter`
4. `FileSystemAttestationRepositoryAdapter`
5. `GranularityDerivationService`
6. `AttestationRecordMapper`
7. `ProduceAttestationUseCase` / `VerifyAttestationUseCase`
8. `AttestHandler` / `VerifyAttestationHandler`

### 6.4 index.ts

**ファイル**: `scripts/harness/attestation/index.ts`

Unit 公開境界。`createAttestationModule` と公開 handler / 主要 DTO 型（`AttestationDocument` 等）を再エクスポートする。`main.ts` からの配線は後続フェーズで本 index を通じて行う。

---

## 7. テスト方針

### 7.1 層別テスト方針

| 層 | テスト方針 |
|----|-----------|
| domain | 実オブジェクト中心。VO・集約・`GranularityDerivationService`・canonical 直列化はモック禁止。`ContentHasherPort` のみ in-memory fake 可 |
| application | ポート（GateResultSource / Repository / Hasher）のみモック可。usecase の分岐（require-pass suppress、mode signed 拒否、mismatch 検出）を確認 |
| infrastructure | 実 `node:crypto`・実ファイル I/O・実 subprocess（ci-check）で統合寄りに検証 |
| presentation / E2E | argv・stdout・exitCode を検証。CLI round-trip（attest → verify green、改竄 → verify exit 1）を実施 |

共通ルール: AAA パターン厳守、テストケース名は日本語、Domain 層はドメインオブジェクトをモックしない。

### 7.2 テストケース概要

#### domain

| 対象 | 主なテストケース |
|------|----------------|
| `Digest` | `sha256:` + 64hex 以外を拒否すること |
| `AttestationRecord` | INV-1: gateResult と validatorSet の allPassed 不一致を拒否すること |
| `AttestationRecord` | INV-6: unsigned-poc で algorithm/keyId/value が null 以外なら拒否すること |
| `AttestationRecord.toCanonicalPayload` | signature と volatile metadata（producedAt/gitCommit）が除去されること |
| `AttestationRecord.seal` | 同一入力で producedAt が変わっても attestationDigest が一致すること（決定論） |
| `GranularityDerivationService` | L3-004 を含む set から `level:"file"` と file-level known-limitation を導出すること |

#### application

| 対象 | 主なテストケース |
|------|----------------|
| `ProduceAttestationUseCase` | pass 時に record を生成し `--out` に書くこと |
| `ProduceAttestationUseCase` | `--require-pass` かつ gate fail 時に record を出力せず exitCode 1 を返すこと |
| `ProduceAttestationUseCase` | `--mode signed` で exitCode 2 を返し record を生成しないこと |
| `VerifyAttestationUseCase` | 未改竄 record で全チェック合格・exitCode 0 |
| `VerifyAttestationUseCase` | validatorSet 改竄（granularity 詐称）で granularity mismatch・exitCode 1 |
| `VerifyAttestationUseCase` | source ファイル変更で inputHashes mismatch・exitCode 1 |
| `VerifyAttestationUseCase` | 非対応 mode（signed）で exitCode 2 |

#### infrastructure

| 対象 | 主なテストケース |
|------|----------------|
| `NodeCryptoContentHasherAdapter` | 既知入力の sha256 が `sha256:<64hex>` で返ること |
| `FileSystemSourceDigesterAdapter` | ファイル内容から sha256 digest を返すこと |
| `CiCheckGateResultAdapter` | ci-check --json の出力から allPassed / validatorResults を抽出すること |
| `FileSystemAttestationRepositoryAdapter` | 2スペース JSON + 改行で書き、read で復元できること |

#### presentation / E2E

| 対象 | 主なテストケース |
|------|----------------|
| `AttestHandler` | 未知フラグ・`--mode signed` で exitCode 2 |
| E2E round-trip | attest で生成した record を verify すると exitCode 0 |
| E2E tamper-detection | 生成後に record の gateResult/validatorSet/inputs を書き換えると verify が exitCode 1 |

### 7.3 回帰観点

| ストーリー | 回帰観点 |
|-----------|---------|
| H16-01 | 同一入力・同一 gate 結果なら producedAt に依らず attestationDigest が一致すること（決定論 / INV-4） |
| H16-01 | `granularity` が validatorSet から導出され L3-004 file-level 制約を必ず含むこと |
| H16-01 | `--require-pass` 下の gate fail で record が一切出力されないこと |
| H16-02 | 改竄した record（digest/input/granularity のいずれか）が verify で exit 1 になること |
| H16-02 | 非対応 mode（signed）が exit 2 で拒否されること |

---

## 8. ストーリーとの対応

### H16-01: Attestation record generation (phasegate:attest)

| 要求 | 対応設計 |
|------|---------|
| record format 生成 | `AttestationRecord` + `AttestationRecordMapper` + `ProduceAttestationUseCase` |
| ci-check 観測 | `GateResultSourcePort` + `CiCheckGateResultAdapter`（subprocess） |
| 入力 digest | `FileSystemSourceDigesterAdapter`（sha256） + `inputDigest` 決定論規則（§1.4.2） |
| granularity 導出 | `GranularityDerivationService`（L3-004 file-level） |
| unsigned-poc digest | `SignatureBlock.unsignedPoc()` + canonicalization（§1.4.1） |
| `--require-pass` / `--out` / `--mode` | `AttestHandler` + `ProduceAttestationUseCase` |

### H16-02: Attestation verification (phasegate:verify-attestation)

| 要求 | 対応設計 |
|------|---------|
| INTEGRITY 再チェック | `computeAttestationDigest` 再計算 == 格納値 |
| input-hash 再照合 | `FileSystemSourceDigesterAdapter` で現在ファイル再計算 |
| anti-laundering 再導出 | `GranularityDerivationService.derive` == 格納 granularity |
| 非対応 mode 拒否 | `VerifyAttestationUseCase` の mode check（exit 2） |
| exit 0/1/2 | `VerifyAttestationHandler` + usecase exitCode |
<!-- @work-item-id WI-224 -->

## World Model provider boundary（ADR-031〜033）

<!-- @work-item-id WI-281 -->

attestation は gate-run evidence、record schema、produce / verify と evidence lifecycle の owner であり続ける。World Model へは evidence の plain DTO / public read facade だけを公開し、`AttestationRecord`、`Digest`、`ContentHasherPort`、repository / crypto adapter を露出しない。World 側の anti-corruption adapter は world-model infrastructure に置き、attestation は world-model を import しない。将来の `worldSnapshotRoot` は top-level composition が primitive input として注入し、相互 import を作らない。

<!-- @work-item-id WI-282 -->

`@attestation` は Story scope evidence への明示 reference として公開 projection に残すが、annotation の line、occurrence ordinal、record 配列順を stable ExplicitClaim ID に昇格しない。attestation-owned record identity と verification semanticsを維持し、World の `pgw:v1` node ID、Fragment alias、Constraint identity を attestation domain に複製しない。file path や evidence locator が変わった場合の World identity / continuity 判定は consumer 側で行う。

<!-- @work-item-id WI-283 -->

World 向け evidence projection は evidence semantics と verification status を含め、`producedAt`、`gitCommit`、producer package version、signature bytes、attestation self-digest、将来の `worldSnapshotRoot` self-reference を semantic root 入力から除外できる plain DTO とする。この projection は attestation record 自体の canonical payload / verification contractを変更しない。SHA-256 は §10 の public `Sha256Capability` を唯一の公開 primitive とし、World 導入のために `node:crypto` call siteを追加しない。

## WI-306: attestation v2 / World root injection

<!-- @work-item-id WI-306 -->

@story-id H17-18

v2は`schemaVersion: phasegate-attestation/v2`、`predicateType: https://phasegate.dev/attestation/gate-run/v2`、top-level必須`worldSnapshotRoot`を持つ。rootはcanonical payloadへ含めるが、fragment digest配列は追加しない。mapperはv1 / v2だけをadmitし、version / predicate / root presence mismatchを`L1-053`としてfail-closedにする。

compositionはoptional `WorldSnapshotRootProvider`をProduce usecaseへ渡す。未配線なら既存v1、配線時はproviderを一度readしてv2を生成する。attestationはworld-modelをimportせず、top-level harness compositionがWorld public facadeからplain rootを注入する。v1 verify / programmatic produceは無期限に維持し、CLI compositionはv2 providerを配線する。
