# WI-300 Domain Model: World configuration

<!-- @work-item-id WI-300 -->

## WorldConfig

config-foundationが所有するimmutable Value Object。`enabled`、corpus roots / selection、provider inputs、external declaration paths、generated output path、session-start limitを一つのresolved documentとして保持する。

### Invariants

- pathはproject-relative POSIX形式で、absolute path、backslash、`.` / `..` segmentを受理しない。
- corpus rootは空配列を許さず、同一role内の重複および異なるrole間の同一・包含rootを拒否する。
- pathのcase-fold collisionはwinnerを選ばずconfig errorにする。
- `sessionStart.maxItems`は1〜20、`maxChars`は1〜8000の整数。
- include / exclude globは非空で、重複しない。

## WorldConfigSourceDocument / WorldConfigDocument

sourceはnested partial override、resolved documentは全fieldを持つplain DTOである。preset resolutionがcanonical defaultsとsourceをmergeした後に`WorldConfig`で不変条件を検証し、consumerへはdomain型ではなくplain copyを返す。

## Ownership

config-foundationはschema、default、merge、validationを所有する。world-modelはresolved DTOをconsumer-owned application configへ変換する。validator-systemはWM-19 / WM-20で`enabled`とpathを読むが、このWIではgate semanticsを持たない。
