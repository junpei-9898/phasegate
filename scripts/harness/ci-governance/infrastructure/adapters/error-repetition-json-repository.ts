/**
 * @layer infrastructure
 * @unit ci-governance
 *
 * ErrorRepetitionRepositoryPort実装（.harness/error-history.json）
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { ErrorRepetitionRepositoryPort } from '../../domain/ports/error-repetition-repository-port.js';
import { ErrorRepetition } from '../../domain/aggregates/error-repetition.js';
import type { ErrorHistoryJson } from '../schema/error-history-schema.js';

export class ErrorRepetitionJsonRepository implements ErrorRepetitionRepositoryPort {
  private readonly filePath: string;

  constructor(baseDir: string) {
    this.filePath = path.join(baseDir, '.harness', 'error-history.json');
  }

  async findByCode(code: string): Promise<ErrorRepetition | null> {
    const data = await this.loadData();
    const entry = data.entries.find((e) => e.code === code);
    if (!entry) return null;
    return ErrorRepetition.createWithCount(entry.code, entry.occurrenceCount, entry.threshold);
  }

  async save(errorRepetition: ErrorRepetition): Promise<void> {
    const data = await this.loadData();
    const existingIndex = data.entries.findIndex((e) => e.code === errorRepetition.code);
    const newEntry = {
      code: errorRepetition.code,
      occurrenceCount: errorRepetition.occurrenceCount,
      escalated: errorRepetition.escalated,
      threshold: errorRepetition.threshold,
    };

    let newEntries;
    if (existingIndex >= 0) {
      newEntries = data.entries.map((e, i) => (i === existingIndex ? newEntry : e));
    } else {
      newEntries = [...data.entries, newEntry];
    }

    const newData: ErrorHistoryJson = { version: '1.0', entries: newEntries };
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(newData, null, 2), 'utf-8');
  }

  async deleteByCode(code: string): Promise<void> {
    const data = await this.loadData();
    const newEntries = data.entries.filter((e) => e.code !== code);
    const newData: ErrorHistoryJson = { version: '1.0', entries: newEntries };
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(newData, null, 2), 'utf-8');
  }

  private async loadData(): Promise<ErrorHistoryJson> {
    try {
      const content = await fs.readFile(this.filePath, 'utf-8');
      const parsed = JSON.parse(content) as ErrorHistoryJson;
      if (!parsed || !Array.isArray(parsed.entries)) {
        throw new Error('Invalid error-history.json schema');
      }
      return parsed;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return { version: '1.0', entries: [] };
      }
      throw err;
    }
  }
}
