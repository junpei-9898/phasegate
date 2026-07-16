# WI-286 Domain Model: Public SHA-256 capability

<!-- @work-item-id WI-286 -->

@story-id H17-01

## 1. Ownership

attestationはSHA-256 primitiveのdeployment ownerとしてplain public capabilityを提供する。ただしgeneric hash domainやshared `Digest` VOのownerにはならない。

| Concept | Owner / classification | Contract |
|---|---|---|
| `Sha256Capability` | attestation application public port | bytesをSHA-256しplain digest stringを返す |
| `Sha256DigestString` | public scalar type | external formは`sha256:<64 lowercase hex>` |
| `hashUtf8` | public pure helper | `TextEncoder`でUTF-8化し`hashBytes`へ委譲 |
| `ContentHasherPort` | attestation domain internal port | stringからattestation-local `Digest`を返す |
| `Digest` | attestation domain local VO | attestation集約のINV-4 / INV-5を保証 |
| `WorldHashingPort` | world-model consumer-owned port | WM-07以降にWorld-local VOへ変換 |

`Sha256Capability`は`ContentHasherPort`を継承せず、`Digest`を引数・戻り値に含めない。

## 2. Public contract

```text
type Sha256DigestString = `sha256:${string}`

interface Sha256Capability {
  hashBytes(bytes: Uint8Array): Sha256DigestString
}

hashUtf8(capability, text): Sha256DigestString
```

template literal typeだけでは64桁lowercaseを静的に完全表現できないため、provider implementationがruntime invariantを保証し、contract testがexact patternを検証する。consumerは各Unitのlocal VO factoryでも再検証する。

## 3. Internal adaptation

```text
string
  -> hashUtf8(Sha256Capability, string)
  -> plain sha256:<hex>
  -> Digest.create(...)
  -> attestation domain
```

`NodeCryptoContentHasherAdapter`は`ContentHasherPort`のadapterとして残るが、`node:crypto`を直接呼ばない。public capability implementationだけが既存primitiveを所有する。

## 4. Invariants

1. `hashBytes`はinputをmutationしない。
2. resultは`^sha256:[0-9a-f]{64}$`に一致する。
3. empty bytesを含む全inputでSHA-256 algorithmを固定する。
4. `hashUtf8`はUnicode normalizationをせず、ECMAScript `TextEncoder`のUTF-8 bytesを使う。
5. public contractにattestation-local typeを露出しない。
6. implementation移動後もrepository内のSHA-256 `node:crypto` call-site数を増やさない。

## 5. Error semantics

Node.js SHA-256 providerの予期しないexecution failureはそのままexecution errorとして伝播する。public capabilityはalgorithm fallback、silent truncation、別encodingへのfallbackを行わない。
