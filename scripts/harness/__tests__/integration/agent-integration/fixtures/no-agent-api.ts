import { readFile } from 'node:fs/promises';

export async function readSomeFile(path: string): Promise<string> {
  return readFile(path, 'utf8');
}
