# WI-286 Logical Design: Public SHA-256 capability

<!-- @work-item-id WI-286 -->

@story-id H17-01

## 1. Current state

- `NodeCryptoContentHasherAdapter`が`createHash("sha256")`とattestation-local `Digest`生成を所有する。
- `composition-root.ts`がadapterを直接生成し、produce / verify use caseへ同じinstanceを渡す。
- root `index.ts`はhandler / DTO / module factoryだけを公開し、hashing surfaceを持たない。
- `FileSystemSourceDigesterAdapter`にもraw file bytes用の別SHA-256 call siteがあるが、ADR-033によりWM-06の統合対象外である。

## 2. Target dependency flow

```text
attestation/index.ts
  -> exports Sha256Capability type, hashUtf8 helper, createSha256Capability factory

createSha256Capability()
  -> NodeCryptoSha256Capability (infrastructure, existing createHash primitive moved here)

createAttestationModule()
  -> Sha256Capability
  -> NodeCryptoContentHasherAdapter
  -> ContentHasherPort
  -> Produce / Verify use cases

future world-model infrastructure adapter
  -> attestation public index only
  -> WorldHashingPort / World-local Sha256Digest
```

## 3. Planned source changes

| Path | Change |
|---|---|
| `application/ports/sha256-capability.ts` | plain interface、digest scalar、UTF-8 helper |
| `infrastructure/adapters/node-crypto-sha256-capability.ts` | existing `createHash("sha256")` primitiveの移動先 |
| `infrastructure/adapters/node-crypto-content-hasher-adapter.ts` | capabilityを受けlocal `Digest`へ変換 |
| `composition-root.ts` | public factory追加、module内で同capabilityをadapterへ注入 |
| `index.ts` | type / helper / factoryだけをpublic export |

concrete `NodeCryptoSha256Capability` classはroot barrelからexportしない。consumerはfactoryが返すplain interfaceだけを見る。

## 4. Compatibility

- `ContentHasherPort.sha256(string): Digest`を変更しない。
- `AttestationRecord`、produce / verify use case、record schemaを変更しない。
- `NodeCryptoContentHasherAdapter`は引数なしconstructionを互換維持し、既定でpublic capability implementationを利用する。composition-rootではdependencyを明示注入する。
- existing attestation digest bytesとrecord verification resultを維持する。

## 5. Import rules

許可:

```text
attestation infrastructure -> attestation application Sha256Capability
attestation infrastructure -> attestation domain ContentHasherPort / Digest
attestation index -> application public type/helper
attestation composition-root -> infrastructure concrete implementation
future world-model infrastructure -> attestation index public contract
```

禁止:

```text
world-model -> attestation/domain/**
world-model -> attestation/infrastructure/**
world-model -> attestation/domain/value-objects/digest
attestation application/domain -> node:crypto
```

## 6. TDD sequence

1. RED: public root import、known bytes、UTF-8 helper、adapter equivalence testを追加する。
2. GREEN: public contract / implementation / factoryを追加し、existing adapterをdelegateへ変更する。
3. REFACTOR: public export setとcall-site countを検査し、internal type leakageを除く。
