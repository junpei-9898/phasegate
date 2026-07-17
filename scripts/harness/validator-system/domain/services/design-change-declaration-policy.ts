// @unit validator-system
// @layer domain
// @work-item-id WI-305

export interface DesignChangedFragmentInput {
  readonly corpusRole: "product" | "inception";
  readonly declaredKey: string;
  readonly path: string;
  readonly workItemIds: readonly string[];
}

export interface DesignPinnedEndpointInput {
  readonly constraintId: string;
  readonly endpoint: "claimant" | "premise";
  readonly corpusRole: "product" | "inception";
  readonly declaredKey: string;
}

export interface DesignChangeDeclarationFinding {
  readonly code: "design-change-declaration-missing";
  readonly corpusRole: "product" | "inception";
  readonly declaredKey: string;
  readonly path: string;
  readonly expectedWorkItemIds: readonly string[];
  readonly constraintIds: readonly string[];
}

export interface DesignChangeDeclarationEvaluation {
  readonly checkedFragmentCount: number;
  readonly findings: readonly DesignChangeDeclarationFinding[];
}

export interface DesignChangeDeclarationInput {
  readonly changedFragments: readonly DesignChangedFragmentInput[];
  readonly pinnedEndpoints: readonly DesignPinnedEndpointInput[];
  readonly trailerWorkItemIds: readonly string[];
}

const compare = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0);
const keyOf = (value: { readonly corpusRole: string; readonly declaredKey: string }): string =>
  `${value.corpusRole}\u0000${value.declaredKey}`;
const uniqueSorted = (values: readonly string[]): readonly string[] =>
  Object.freeze([...new Set(values)].sort(compare));

export class DesignChangeDeclarationPolicy {
  evaluate(input: DesignChangeDeclarationInput): DesignChangeDeclarationEvaluation {
    const endpointsByFragment = new Map<string, DesignPinnedEndpointInput[]>();
    for (const endpoint of input.pinnedEndpoints) {
      const key = keyOf(endpoint);
      const current = endpointsByFragment.get(key) ?? [];
      current.push(endpoint);
      endpointsByFragment.set(key, current);
    }
    const trailerIds = new Set(input.trailerWorkItemIds);
    const pinnedChanges = input.changedFragments
      .filter((fragment) => endpointsByFragment.has(keyOf(fragment)))
      .sort((left, right) => compare(keyOf(left), keyOf(right)) || compare(left.path, right.path));
    const findings = pinnedChanges.flatMap((fragment): readonly DesignChangeDeclarationFinding[] => {
      if (fragment.workItemIds.some((workItemId) => trailerIds.has(workItemId))) return [];
      return [
        Object.freeze({
          code: "design-change-declaration-missing" as const,
          corpusRole: fragment.corpusRole,
          declaredKey: fragment.declaredKey,
          path: fragment.path,
          expectedWorkItemIds: uniqueSorted(fragment.workItemIds),
          constraintIds: uniqueSorted(
            (endpointsByFragment.get(keyOf(fragment)) ?? []).map((endpoint) => endpoint.constraintId),
          ),
        }),
      ];
    });
    return Object.freeze({ checkedFragmentCount: pinnedChanges.length, findings: Object.freeze(findings) });
  }
}
