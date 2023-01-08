export interface PluginSettings {
	folderNames: {
		imports: string,
		attachments: string
	},
	tagNames: {
		colorPrepend: string,
		isPinned: string,
		hasAttachment: string,
		isArchived: string,
		isTrashed: string,
	},
	importArchived: boolean,
	importTrashed: boolean,
}