// Type definitions for results and errors
//////////////////////////////////////////

export enum ImportOutcomeType {
    UserIgnored,
    CreationError,
    ContentError,
    FormatError,
    Imported,
}

export enum IgnoreImportReason {
    Trashed,
    Archived,
}

export interface ImportResult {
    keepFilename: string;
    obsidianFilepath?: string;
    outcome: ImportOutcomeType,
    error?: Error;
    ignoredReason?: IgnoreImportReason,
    details?: string,
}