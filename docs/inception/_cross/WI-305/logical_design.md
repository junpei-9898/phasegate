# WI-305 Logical Design: commit-msg reflection path

<!-- @world-fragment-id agent-integration.design-change-declaration -->
<!-- @work-item-id WI-305 -->
## Flow

```text
.husky/commit-msg
  -> runCommitMsgCli(message, staged files)
  -> resolved config world.enabled
       false -> design declaration sectionなし
       true  -> TraceabilityDesignChangeFacade.observe(staged files)
             -> git staged baseline/current + zero-context hunks
             -> explicit fragment ranges / @work-item-id / @world-reflects
             -> WorldPinnedEndpointFacade.read()
             -> constraint claimant/premise pin projection
             -> DesignChangeDeclarationPolicy.evaluate(..., Work-Item trailers)
             -> PASS / non-bypassable FAIL / fixed-code WARN
```

## Staged observation

traceability infrastructure adapterはGit objectをread-onlyで参照する。currentはindex、baselineは`HEAD`、changed rangesは`git diff --cached --unified=0`から得る。metadata preludeにある`@world-fragment-id`から次の明示marker直前までをfragment rangeとし、hunkが交差したfragmentだけを返す。追加fragmentはcurrent、削除fragmentはbaselineを観測する。rename continuityは推論せず、unsupported diffはunavailable diagnosticへする。

## Pin projection

world-model application facadeは既存constraint repositoryをconsumer側へ露出せず、supported documentのclaimant / premiseのうち明示fragment IDだけをplain DTOへcopyする。不在はavailable empty、invalid schema / I-Oはunavailableである。duplicate/no-winner等のWCR admissionは既存L2/L3の責務のままとする。

## Blocking boundary

validator policyは`corpusRole + declaredKey`がpinと一致したchanged fragmentだけを評価する。fragmentに宣言されたcanonical `WI-\d+`とcommit trailerのcanonical WIに共通項があればpass、なければblockする。複数trailerは許容し、少なくとも1件のexact matchを必要とする。unpinned、legacy whole-file、ADR/source、明示reflectionのないfragmentはこのcheckだけではblockしない。

観測不能はfixed code warningへfail-openする。これはlocal hookが偽造可能でavailability failureをrepository-wide blockerへ拡張しないためである。new / malformed constraintとstructural obligationのfail-closed判定はL2-017 / L3-008が担当し、authoritative trust rootはL3に置く。
