// Type definitions for results and errors
//////////////////////////////////////////

export enum LogStatus {
    Note,
    Error,
    Warning,    // Imported with error
    Success,
}

export enum IgnoreImportReason {
    Trashed,
    Archived,
}

export interface ImportResult {
    keepFilename: string;
    obsidianFilepath?: string;
    logStatus: LogStatus,
    error?: Error;
    ignoredReason?: IgnoreImportReason,
    details?: string,
}