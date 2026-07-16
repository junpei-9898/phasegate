# WI-290 Domain Model: Runtime and generated owner projections

<!-- @work-item-id WI-290 -->

@story-id H17-05

## 1. Runtime extraction result

各extractorは`RuntimeFactExtraction { nodes[], edges[], diagnostics[] }`を返す。policy / blocking / exit codeは持たない。optional provider file不在はnodeなし + `not-present` diagnosticで表す。

## 2. SourceFile

`SourceFile`はPathKey、LF-normalized content digest、次のattributesを持つ。

```text
{
  sourceKind: "implementation" | "test"
  unit: string | null
  layer: string | null
  workItemIds: string[]
}
```

implementation extractorは`__tests__`を除く`scripts/harness/**/*.ts`、test source extractorは`scripts/harness/__tests__/**/*.ts`を所有する。test fileをmatrix TestReferenceと同一nodeにせず、Story / AC bindingはmatrix ownerに残す。

## 3. Matrix

- matrix fileは`generated-artifact × generated` Artifact。
- semantic projectionは`version`、sorted Story / AC / TestReference。`generatedAt`を除外する。
- TestReferenceは`WorldNode.testReference`としてowner tuple `(storyId, acId, binding ?? file, testType, filePath, testName)`をidentityにする。
- duplicate tupleは全candidateを除外して`duplicate-node-id`。
- Artifact content digestはraw JSON bytesでなくcanonical semantic projectionのdigest。

## 4. Attestation

- attestation fileは`generated-artifact × generated` Artifact。
- public `AttestationDocument`からschema / predicate、gate result、validator outcomes、non-git input semantics、granularity、acBoundScopeを投影する。
- public verify resultの`ok / checks / mismatches`をverification statusとして含める。
- `metadata.producedAt / producer / gitCommit`、`signature`全体、attestationDigest、`git:HEAD` sourceとそれを含み得るderived `inputDigest`をprojectionから除外する。
- unknown schema / projection field、public verification不能はartifactを生成せずdiagnostic。

## 5. Integrity manifest

- `phasegate.integrity.json`は`external-declaration × external` Artifact。
- projectionは`version: 1`、`algorithm: sha256`、path順の`{path,digest:"sha256:<hex>"}`。
- manifestが宣言するhexはraw target bytesのowner contractとして保持し、World text normalizationで再計算しない。
- current manifestにはstable claim IDがないためExplicitClaim nodeを捏造しない。

## 6. Diagnostic invariants

unsupported schema / field、malformed JSON / metadata、duplicate identity、invalid PathKey / digest、read failureをcode + path + payloadへ保持する。unknown fieldをgenericに削除せず`unsupported-projection-field`とし、invalid provider artifactをempty projectionへ変換しない。
