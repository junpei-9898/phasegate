export interface MigrationMappingOutput {
  v0TestId: string;
  v1TestPath: string;
  migrationStatus: 'migrated' | 'modified';
  biomeModification: {
    targetApi: string;
    replacementApi: string;
    modificationReason: string;
  } | null;
}

export interface MigrateV0TestsOutput {
  mappings: MigrationMappingOutput[];
  totalCount: number;
  migratedCount: number;
  modifiedCount: number;
  skippedCount: number;
}
