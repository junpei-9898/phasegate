---
adr_id: "036"
title: "World constraints と L4-004 doc freshness の共存"
status: Proposed
date: 2026-07-16
---

# World constraints と L4-004 doc freshness の共存

<!-- @work-item-id WI-284 -->

## Context

World Modelのexplicit pin / reference driftとL4-004 `doc-freshness`は、どちらも「文書が現在の実装・設計に追随しているか」という利用者の懸念に関係する。しかし、検査するpredicateとevidenceは異なる。同じ文書に両findingが出たとき一方を機械的にduplicateとして消すと、時間経過のsignalか明示constraint違反のどちらかを失う。

実コードを確認すると、L4-004は廃止済みではない。

- validator-system `buildDefaultRegistry()`は`L4-004`を`always` conditionで登録し、`ValidatorId`は`doc-freshness`へ対応付ける。
- validator-system composition-rootはphase2-extensions `CheckDocFreshnessUseCase`を`RunL4ValidatorsUseCase`へ注入する。
- RunL4はresolved design rootの`**/*.md`を対象にuse caseを実行し、non-`ok` resultを`L4-004`のwarning / errorへ写像する。
- phase2-extensions `GitLogDocumentAgeAdapter`はdocument自身の最新`git log --format=%ai`からageを計算し、取得できなければfile `mtime`へfallbackする。
- default freshness ruleはwarn 30日 / error 90日である。
- `DocumentAgeSource`には`related-source-change`が定義されるが、current production adapterが返すのは`git-log`または`file-mtime`だけである。source hash / explicit dependency / referenceを読むproduction pathはない。

self-repo `phasegate.config.json`は`layers.L4.enabled: false`である。minimal / standard presetもL4 disabled、strict presetはenabledだが、全presetのvalidator listに`doc-freshness-checker`が存在する。disabled L4はaggregate実行でskip resultになり、明示的な`validate --layer L4`は`forceLayerEnabled`により実行される。

ADR-031はvalidator-systemがgate / blocking policy、world-modelがexplicit constraint evaluationを所有すると決定した。ADR-034はWCRをexistence、ID uniqueness、explicit reference、declared dependency、digest equalityへ限定した。ADR-035はWorld `violationFingerprint` / adoption baseline / waiverをWCR findingだけに適用した。本ADRは既存L4-004を壊さず、この二つのsignalのcanonical ownerと移行条件を決める。

## Decision

### 1. L4-004は時間proxy、Worldは明示構造を検査する

| concern | L4-004 doc freshness | World WCR |
|---|---|---|
| predicate | document ageがconfigured warn / error days以上か | explicit endpoint、reference、dependency、pin digestが宣言どおりか |
| evidence | latest document git timestamp、fallback mtime、current date、threshold | stable World IDs、declared fact、claimant / premise pins、canonical content digest |
| identity | validator ID `L4-004` + phase2 freshness rule ID + document path | `WCR-NNN` + constraint ID + violation fingerprint |
| determinism | clock、Git history、fallback filesystem metadataに依存するoperational signal | ADR-033 rootsとexplicit policy inputsから再導出するcontent-addressed result |
| semantics | 古さをstaleness riskのproxyとして通知するheuristic | 宣言済み構造の一致 / 不一致を検証する |
| owner | phase2-extensionsがfreshness rule / age evaluation、validator-systemがregistry / gate | world-modelがWCR evaluation、validator-systemがgate |

L4-004は「古いから内容が誤っている」と断定しない。Worldはdigest / reference driftを「N日古い」と変換しない。clock、git timestamp、mtimeをWorld `corpusRoot`、constraint evaluation、violation fingerprintへ入れない。

current production L4-004はsource変更との因果やexplicit design-source relationを検査しない。将来`related-source-change` producerを追加する場合も、明示World dependency / pinで判定できる部分をL4 heuristicとして再実装しない。

### 2. Predicateごとにcanonical rule ownerを一つにする

- **age threshold**のcanonical ownerはphase2-extensions `DocFreshnessRule` / `FreshnessCheckService`、public validator IDはvalidator-system `L4-004`。
- **explicit endpoint existence / uniqueness / reference / dependency / digest equality**のcanonical ownerはworld-model `WCR-001`〜`WCR-008`。
- **severity、blocking、fail-on-warning、layer execution、exit code**のcanonical ownerはvalidator-system。

L4-004 findingからWCR findingを生成しない。WCR findingからL4-004 ageを推定しない。rule text、message、document pathが似ていてもownerを統合しない。

同じdocumentに両findingが出た場合、両predicateはそれぞれ正しいsignalである。ただしexplicit structural remediationについてはWCR obligationをcanonicalとし、L4-004はtemporal supporting signalとして関連付ける。

- World obligation reportの`structuralObligations`、`violationFingerprint`、adoption baseline、waiverにはWCR findingだけを入れる。
- L4-004 findingをWorld structural obligation数へ加えず、World baseline / waiverで抑止しない。
- L4-004がpassしてもWCR violationを打ち消さず、WCRがpass / adopted / waivedでもL4 age findingを打ち消さない。
- presentationで関連付ける場合はresolved Artifact / FragmentのPathKeyを使い、message substringや実行順でdeduplicateしない。
- 同じpathに両方ある場合、WCRをprimary remediation、L4-004を`supporting-temporal-signal`として表示できるが、raw validator resultsは保持する。

### 3. L4-004を現役product capabilityとして維持する

World導入だけを理由にL4-004、`p2:check-freshness`、phase2-extensions freshness domainを削除しない。Worldのexplicit constraint coverageが増えても、宣言のない文書や「一定期間reviewされていない」という独立policyは残るためである。

現行配置を維持する。

- phase2-extensions: `DocFreshnessRule`, threshold、age port / adapter、use case、compatibility handler
- validator-system: `L4-004` registry、RunL4 bridge、severity / aggregation
- config-foundation: preset validator listとL4 enablement

L4-004をWorld rulesetへ移動せず、World `rulesetVersion`変更の理由にしない。L4 threshold / age semantics変更はL4 capability自身のversioned product design / testsで管理する。

### 4. Dual-run compatibility periodを設ける

compatibility periodは、WM-20でL3 authoritative World re-derivationが対象document patternに対して利用可能になった時点から開始する。終了は次の全条件を満たした後とする。

1. WM-24 production-ready checkpointが完了している。
2. 対象patternで少なくとも一つのconfigured L4 warn-threshold期間を経過している。default ruleでは30日。
3. 対象patternで少なくとも2回のscheduled / explicit dual-run結果が保存reportではなく再実行から比較されている。
4. overlap、L4-only、WCR-only findingをdocument class / rule owner別に集計し、canonical owner誤りとsilent lossがない。

期間中はL4-004とWorld WCRを両方実行可能にし、既存validator ID / command / preset entryを削除しない。overlapはfinding数を隠すdedupではなく、presentation correlationとして扱う。

compatibility measurement自体をWorld adoption baselineへ入れず、L4-only findingを`violationFingerprint`へ変換しない。

### 5. 維持、縮退、移行、廃止の条件を分ける

#### 維持

次のいずれかが真なら対象patternのL4-004を維持する。

- time-since-review自体がproduct / consumer policyとして必要。
- explicit World constraintでcoveredされないdocumentがある。
- compatibility periodにactionableなL4-only findingがある。
- Git age / mtime fallbackを使うconsumer automationまたは`p2:check-freshness`互換経路がある。

#### 縮退

対象document classについて次を全て満たす場合だけ、別WIでscan pattern、threshold policy、severityの縮退を提案できる。

- World explicit constraint inventoryが対象classをcompleteと判定している。
- compatibility periodにL4-only findingがない、または全てnon-actionableとreviewされた。
- time-only freshness policyを不要とするproduct ownerの明示判断がある。
- config / preset / compatibility commandへのimpactとmigration guideが用意される。

縮退はpattern単位とし、repository全体のL4-004を一括disable / deleteしない。

#### Worldへ移行

L4 implementationに将来、explicit hash / reference / dependency checkが追加されてWorld WCRと同一predicateになった場合、そのsub-ruleはWorldをcanonical ownerとして移行する。dual-runで同値性を確認し、L4側duplicate sub-ruleをdeprecateする。

current git-age / mtime threshold predicateにはWCR equivalentがないため、Worldへ移行しない。

#### 廃止

`L4-004` IDまたはpublic compatibility command全体の廃止は本ADRでは決定しない。全supported preset / consumerでage policyが不要、unique L4-only valueがない、deprecation periodとregistry / config / docs / tests migrationが完了、という条件を満たした別ADR / breaking changeだけが決定できる。

### 6. Self-repoのL4 disabledとproduct capabilityを分離する

self-repoの`layers.L4.enabled: false`はdogfood execution policyであり、capability不存在や廃止を意味しない。

- self-repoでaggregate / CI pathがL4をskipしても、L4-004 registry、composition wiring、tests、preset contractを維持する。
- operatorが明示する`validate --layer L4`はdisabled self-repoでもforce-enableしてL4-004を実行できる。
- strict presetはL4 enabledを維持し、minimal / standard presetのdisabled方針を本ADRで変更しない。
- self-repoをdefault-onへ変更するかは、World rolloutとは別のconfig / noise-budget判断とし、本ADRでは変更しない。

したがって、self-repoでL4がdisabledであることをL4-004 removalの根拠にしない。

### 7. §10の未決事項には該当なし

`docs/inception/_cross/WI-280/delivery_plan.md` §10にADR-036固有の未決事項はない。本ADRは新しいconfig key、validator ID、file name、report pathを決定しない。それらはADR-037のscopeを維持する。

## Consequences

### Positive

- 時間proxyとexplicit structural proofを混同せず、それぞれのsignalを保持できる。
- WCR fingerprint / baselineへheuristic findingが混入することを防げる。
- self-repo configだけを理由に現役product capabilityを削除しない。
- pattern単位のmeasurementに基づき、維持 / 縮退 / 移行を段階判断できる。
- 将来L4へexplicit drift checkが重複実装されることを防げる。

### Negative / Trade-off

- compatibility period中は同じdocumentに二つのfindingが表示され得る。
- L4-004はclock / Git / mtime依存であり、World snapshotと同じbyte determinismを持たない。
- correlation表示とoverlap / unique finding inventoryが必要になる。
- World coverageがcompleteでも、独立したtime policyが残ればL4-004を維持する必要がある。

## Alternatives

- **World導入時にL4-004を即時削除する** — explicit constraintのないdocumentとtime-since-review signalを失い、現役registry / command contractを破るため不採用。
- **L4 age findingをWCR digest driftとして変換する** — ageはcontent mismatchの証拠ではなく、ADR-034のrule限界を越えるため不採用。
- **WCR findingがあればL4 findingを完全に隠す** — time policyの独立違反を失うため不採用。
- **同じpathなら一律duplicateとする** — predicate / evidenceを見ずに異なる責務を統合するため不採用。
- **self-repo L4 disabledをcapability廃止とみなす** — product preset / explicit execution / consumer contractとdogfood policyを混同するため不採用。

## 関連要件・文書

- `docs/inception/_cross/WI-280/delivery_plan.md` §1, §3 WM-04, §7 ADR-036, §10
- `docs/inception/_cross/WI-284/description.md`
- `docs/inception/_cross/WI-284/logical_design.md`
- ADR-031（validator-system / world-model ownership）
- ADR-033（clock / mtime exclusion、canonical roots）
- ADR-034（WCR structural rule limits）
- ADR-035（WCR fingerprint / adoption baseline / waiver）
- phase2-extensions product design（doc freshness）
- validator-system product design（L4 registry / execution）
