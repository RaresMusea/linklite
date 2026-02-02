export type LastMigration = {
    migrationName: string | null;
    startedAt: string | null;
    finishedAt: string | null;
    appliedStepsCount: number | null;
    rolledBackAt: string | null;
    logs: string | null;
};

export type MigrationDetails = {
    migrationName: string | null;
    startedAt: Date | null;
    finishedAt: Date | null;
    appliedStepsCount: number | null;
};