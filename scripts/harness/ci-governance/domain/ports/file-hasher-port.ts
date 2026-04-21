// @unit ci-governance
// @layer domain

export interface FileHasherPort {
  hashFile(relativePath: string): Promise<string>;
}
