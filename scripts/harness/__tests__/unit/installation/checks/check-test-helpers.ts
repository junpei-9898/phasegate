// @unit installation
// @layer test
// @work-item-id WI-145

import { join } from "node:path";
import { vi } from "vitest";
import type { FileInspectorPort } from "../../../../installation/application/ports/file-inspector-port.js";

export function createInspector(overrides: Partial<FileInspectorPort> = {}): FileInspectorPort {
  return {
    exists: vi.fn().mockResolvedValue(false),
    readText: vi.fn().mockResolvedValue(null),
    readJson: vi.fn().mockResolvedValue(null),
    readSymlink: vi.fn().mockResolvedValue(null),
    listFiles: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

export function projectFile(relativePath: string): string {
  return join("/tmp/project", relativePath);
}
