// Type definitions for plugin settings
///////////////////////////////////////

export enum CreatedDateTypes {
	googleKeep = 'Google Keep creation date',
	import = 'Obsidian import date',
};

export interface PluginSettings {
	folderNames: {
		notes: string,
		assets: string,
		unsupportedAssets: string
	},
	createdDate: CreatedDateTypes,
	importArchived: boolean,
	importTrashed: boolean,
	importUnsupported: boolean,
	addColorTags: boolean,
	addPinnedTags: boolean,
	addAttachmentTags: boolean,
	addArchivedTags: boolean,
	addTrashedTags: boolean,
	tagNames: {
		colorPrepend: string,
		isPinned: string,
		hasAttachment: string,
		isArchived: string,
		isTrashed: string,
	},
}
