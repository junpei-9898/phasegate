// @layer infrastructure
// @unit nyquist-validation
// @work-item-id WI-125

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { RequirementTestMatrixDto } from '../../application/dto/generate-matrix-output.js';
import type { ExistingMatrixPort } from '../../application/usecases/generate-requirement-test-matrix-usecase.js';

export class FileSystemGeneratedMatrixAdapter implements ExistingMatrixPort {
  async readExistingMatrix(matrixFilePath: string): Promise<RequirementTestMatrixDto | null> {
    try {
      const raw = await readFile(matrixFilePath, 'utf-8');
      return JSON.parse(raw) as RequirementTestMatrixDto;
    } catch {
      return null;
    }
  }

  async writeMatrix(matrixFilePath: string, matrix: RequirementTestMatrixDto): Promise<void> {
    await mkdir(path.dirname(matrixFilePath), { recursive: true });
    await writeFile(matrixFilePath, `${JSON.stringify(matrix, null, 2)}\n`, 'utf-8');
  }
}
