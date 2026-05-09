/**
 * @layer domain
 * @unit ci-governance
 */

export interface AgentContextDocumentStat {
  readonly exists: boolean;
  readonly ageInDays: number | null;
}

export interface AgentContextDocumentPort {
  readProjectFile(relativePath: string): Promise<string | null>;
  writeProjectFile(relativePath: string, content: string): Promise<void>;
  readHarnessTemplate(relativePath: string): Promise<string>;
  statProjectFile(relativePath: string): Promise<AgentContextDocumentStat>;
  listHarnessSkillNames(): Promise<string[]>;
}
