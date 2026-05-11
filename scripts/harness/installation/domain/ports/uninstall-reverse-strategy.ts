// @unit installation
// @layer domain
// @work-item-id WI-145

import type { ManagedBlock } from "../managed-block.js";

export interface UninstallReverseStrategy {
  readonly fileType: "json" | "shell" | "yaml-add" | "package-json";
  reverse(currentContent: string, block: ManagedBlock): string;
}
