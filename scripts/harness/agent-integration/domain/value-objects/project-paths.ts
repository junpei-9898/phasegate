// @unit agent-integration
// @layer domain

import { ProjectPathsInvariantError } from '../errors/project-paths-invariant-error.js';

type ProjectDocs = {
  construction: string;
  inception: string;
};

export class ProjectPaths {
  private readonly source: readonly string[];
  private readonly docs: Readonly<ProjectDocs>;

  private constructor(source: string[], docs: ProjectDocs) {
    this.source = Object.freeze([...source]);
    this.docs = Object.freeze({ ...docs });
  }

  static create(source: string[], docs: ProjectDocs): ProjectPaths {
    if (source.length === 0) {
      throw new ProjectPathsInvariantError('sourceは1件以上必要です（INV-10違反）');
    }

    if (docs.construction === '' || docs.inception === '') {
      throw new ProjectPathsInvariantError('docs.construction と docs.inception は非空文字列が必要です（INV-11違反）');
    }

    return new ProjectPaths(source, docs);
  }

  getSource(): readonly string[] {
    return this.source;
  }

  getDocsConstruction(): string {
    return this.docs.construction;
  }

  getDocsInception(): string {
    return this.docs.inception;
  }

  equals(other: ProjectPaths): boolean {
    if (this.source.length !== other.source.length) {
      return false;
    }

    return this.source.every((value, index) => value === other.source[index])
      && this.docs.construction === other.docs.construction
      && this.docs.inception === other.docs.inception;
  }
}
