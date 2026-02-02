export type LastMigration = {
    migrationName: string | null;
    startedAt: string | null;
    finishedAt: string | null;
    appliedStepsCount: number | null;
    rolledBackAt: string | null;
    logs: string | null;
};
