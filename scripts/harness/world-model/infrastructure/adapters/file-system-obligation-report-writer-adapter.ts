// @unit world-model
// @layer infrastructure
// @work-item-id WI-295

import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ObligationReportWriterPort } from "../../application/ports/obligation-report-writer-port.js";

let temporarySequence = 0;

export interface FileSystemObligationReportWriterOptions {
  readonly rootDir: string;
  readonly reportPath?: string;
}

export class FileSystemObligationReportWriterAdapter implements ObligationReportWriterPort {
  private readonly reportPath: string;

  constructor(private readonly options: FileSystemObligationReportWriterOptions) {
    this.reportPath = options.reportPath ?? ".harness/world-obligations.json";
  }

  async write(bytes: Uint8Array): Promise<void> {
    const absolutePath = path.join(this.options.rootDir, this.reportPath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    const temporaryPath = `${absolutePath}.${process.pid}-${temporarySequence++}.tmp`;
    try {
      await writeFile(temporaryPath, bytes, { flag: "wx" });
      await rename(temporaryPath, absolutePath);
    } catch (error) {
      await rm(temporaryPath, { force: true }).catch(() => undefined);
      throw error;
    }
  }
}
