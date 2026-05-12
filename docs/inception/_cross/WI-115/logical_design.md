# WI-115 Logical Design

## Scope

Legacy annotation resolution must not map an ambiguous `legacy_id` to the wrong WI.

## Design

`phase-dependency-model` resolves legacy annotations with unit context when product paths provide it. The lookup scope is the inferred product unit plus cross-cutting WIs.

If multiple WIs in scope share the same `legacy_id`, the annotation is ambiguous and does not satisfy reflection for any one candidate. When no unit context can be inferred, the lookup scope is all inception WI directories and duplicate `legacy_id` values are ambiguous globally.

## Product Reflection Rule

Legacy annotations are backward compatibility only. New product reflection uses `@work-item-id`. Legacy IDs remain accepted only when they resolve unambiguously in the applicable scope.

