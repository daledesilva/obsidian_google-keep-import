// Type definitions for Google Keep data structure
//////////////////////////////////////////////////

export interface KeepListItem {
	text: string;
	isChecked: boolean;
}

export interface KeepAttachment {
	filePath: string;
	mimetype: string;
}

export interface KeepJson {
	color: string;
	createdTimestampUsec: number;
	isArchived: boolean;
	isPinned: boolean;
	isTrashed: boolean;
	textContent?: string;
	listContent?: Array<KeepListItem>;
	attachments?: Array<KeepAttachment>;
	title: string;
	userEditedTimestampUsec: number;
}

/**
 * Returns if an imported json matches the Keep interface shape at runtime.
 */
export function objectIsKeepJson(fileContents: KeepJson) {
	return	typeof fileContents.color !== 'undefined'						&&
			typeof fileContents.isTrashed !== 'undefined'					&&
			typeof fileContents.isPinned !== 'undefined'					&&
			typeof fileContents.isArchived !== 'undefined'					&&
			typeof fileContents.title !== 'undefined'						&&
			typeof fileContents.userEditedTimestampUsec !== 'undefined'		&&
			typeof fileContents.createdTimestampUsec !== 'undefined';
}