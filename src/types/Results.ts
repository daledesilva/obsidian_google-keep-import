
export enum ImportOutcomeType {
    UserIgnored,
    CreationError,
    ContentError,
    FormatError,
    Imported,
}

export enum IgnoreImportType {
    Trashed,
    Archived,
}

export interface ImportResult {
    keepFilename: string;
    obsidianFilepath?: string;
    outcome: ImportOutcomeType,
    error?: Error;
    ignoredReason?: IgnoreImportType,
    details?: string,
}
