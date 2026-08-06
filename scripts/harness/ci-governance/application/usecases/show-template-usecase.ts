// @unit ci-governance
// @layer application
// @work-item-id WI-367

import type { TemplateCatalogPort } from "../../domain/ports/template-catalog-port.js";
import { TemplateName } from "../../domain/value-objects/template-name.js";

export type ShowTemplateOutput =
  | { readonly found: true; readonly name: string; readonly content: string }
  | {
      readonly found: false;
      readonly reason: "invalid-name" | "not-found";
      readonly availableNames: readonly string[];
    };

export class ShowTemplateUseCase {
  constructor(private readonly catalog: TemplateCatalogPort) {}

  async execute(rawName: string): Promise<ShowTemplateOutput> {
    if (!TemplateName.isValid(rawName)) {
      // 不正名では catalog を引かない。パス由来の情報を一切露出させない。
      return { found: false, reason: "invalid-name", availableNames: [] };
    }

    const name = TemplateName.create(rawName);
    const content = await this.catalog.read(name);

    if (content === null) {
      const entries = await this.catalog.list();
      return {
        found: false,
        reason: "not-found",
        availableNames: entries.map((entry) => entry.name.value),
      };
    }

    return { found: true, name: name.value, content };
  }
}
