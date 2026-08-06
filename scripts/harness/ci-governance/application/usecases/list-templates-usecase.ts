// @unit ci-governance
// @layer application
// @work-item-id WI-367

import type { TemplateCatalogPort } from "../../domain/ports/template-catalog-port.js";

export interface ListTemplatesOutputEntry {
  readonly name: string;
  readonly fileName: string;
}

export interface ListTemplatesOutput {
  readonly directoryPath: string;
  readonly templates: readonly ListTemplatesOutputEntry[];
}

export class ListTemplatesUseCase {
  constructor(private readonly catalog: TemplateCatalogPort) {}

  async execute(): Promise<ListTemplatesOutput> {
    const entries = await this.catalog.list();
    return {
      directoryPath: this.catalog.directoryPath(),
      templates: entries.map((entry) => ({
        name: entry.name.value,
        fileName: entry.fileName,
      })),
    };
  }
}
