export type MigrationDetails = {
    migrationName: string | null;
    startedAt: Date | null;
    finishedAt: Date | null;
    appliedStepsCount: number | null;
};