import { DataWriteOptions, Notice, Plugin, TAbstractFile, TFile, TFolder, Vault } from "obsidian";
import MyPlugin from "src/main";
import { ImportProgressModal } from "src/modals/import-progress-modal/import-progress-modal";
import { filenameSanitize } from "./string-processes";
import { CreatedDateTypes, PluginSettings } from "src/types/PluginSettings";
import { KeepAttachment, KeepJson } from "src/types/KeepData";
import { IgnoreImportType, ImportResult, ImportOutcomeType } from "src/types/Results";
import { StartImportModal } from "src/modals/start-import-modal/start-import-modal";








export async function runImportSequence(plugin: MyPlugin) {
	const modal = await new StartImportModal(this);
	let fileBacklog;
	try {
		fileBacklog = await modal.showModal();
	}
	catch {
		// Modal was cancelled
		return;
	}

	const fileImporter = new FileImporter(plugin);
	fileImporter.import(fileBacklog);
	
	const progressModal = await new ImportProgressModal(this, fileImporter);
	try {
		await progressModal.showModal();
	}
	catch(message) {
		// Import was cancelled
		fileImporter.stop();
		new Notice(message, 9000);
		return;
	}

}







async function createNewEmptyMdFile(vault: Vault, path: string, options: DataWriteOptions, version: number = 1) : Promise<TFile> {
	let fileRef: TFile;

	try {
		if(version == 1) {
			fileRef = await vault.create(`${path}.md`, '', options);
		} else {
			fileRef = await vault.create(`${path} (${version}).md`, '', options);
		}

	} catch(error) {
;		fileRef = await createNewEmptyMdFile(vault, path, options, version+1);

	}
	

	return fileRef;
}










async function getOrCreateFolder(folderPath: string, vault: Vault): Promise<TFolder> {
	let folder: TFolder | null = null;

	Vault.recurseChildren(vault.getRoot(), (fileOrFolder) => {
		if(fileOrFolder instanceof TFile) return;
		if(fileOrFolder.path != folderPath) return;
		folder = fileOrFolder as TFolder;
	})
	
	// Create the folder if it doesn't exist
	if(folder === null) {
		await vault.createFolder(folderPath);		
		folder = await getOrCreateFolder(folderPath, vault);
	}
	
	return folder;
}



interface OutputLogItem {
	status: string;
	title: string;
	desc: string;
}



export class FileImporter {
	private plugin: MyPlugin;
	private totalImports = 0;
	private successCount = 0;
	private failCount = 0;
	private activeImport = false;
	private outputLog: Array<OutputLogItem> = [];
	private outputLogIter = 0;

	constructor(plugin: MyPlugin) {
		this.plugin = plugin;
	}

	async import(files: Array<Object>) {
		const vault = this.plugin.app.vault;
		const settings = this.plugin.settings;
		this.activeImport = true;
	
		let noteFolder, assetFolder, unsupportedFolder;
		this.totalImports = files.length;
		this.successCount = 0;
		this.failCount = 0;

		
		for(let i=0; i<files.length; i++) {
			const file = files[i] as File;
			let result: ImportResult;

			if(!this.activeImport) return;

			// TODO: These could be functions
			const fileIsJson = file.type === 'application/json';

			const fileIsPlainText =		file.type === 'text/plain'		||
										file.type === 'text/markdown'	||
										file.type === 'text/x-markdown';

			const fileIsBinaryAndSupportedByKeep =	file.type === 'video/3gpp'	||
													file.type === 'audio/amr'	||
													file.type === 'image/png'	||
													file.type === 'image/jpeg'	||
													file.type === 'image/webp'	||
													file.type === 'image/gif';

			// Based on accepted file formats listed here: https://help.obsidian.md/Advanced+topics/Accepted+file+formats
			const fileIsBinaryAndSupportedByObsidian =	// Image files
														file.type === 'image/png'				||
														file.type === 'image/webp'				||
														file.type === 'image/jpeg'				||	// .jpg or .jpeg
														file.type === 'image/gif'				||
														file.type === 'image/bmp'				||
														file.type === 'image/svg+xml'			||
														// Audio files
														file.type === 'audio/mpeg'				||	// .m4a
														file.type === 'audio/m4a'				||	// .m4a
														file.type === 'audio/webm'				||
														file.type === 'audio/wav'				||
														file.type === 'audio/ogg'				||
														file.type === 'audio/3gpp'				||
														file.type === 'audio/x-flac'			||
														// Video files
														file.type === 'video/mp4'				||
														file.type === 'video/webm'				||
														file.type === 'video/ogg'				||	// .ogv
														file.type === 'video/3gpp'				||	// .3gp
														file.type === 'video/quicktime'			||	// .mov
														file.type === 'video/x-matroska'		||	// .mkv
														// Other files
														file.type === 'application/pdf';

	
			if(fileIsJson) {
				// Assume is Google Keep note and attempt to import
				if(!noteFolder) noteFolder = await getOrCreateFolder(settings.folderNames.notes, vault);
				result = await importJson(vault, noteFolder, file, settings);
			
			} else if(fileIsPlainText) {
				// Import as is
				if(!assetFolder) assetFolder = await getOrCreateFolder(settings.folderNames.assets, vault);
				result = await importBinaryFile(vault, assetFolder, file);

			} else if(fileIsBinaryAndSupportedByKeep && fileIsBinaryAndSupportedByObsidian) {
				// Import as supported binary file
				if(!assetFolder) assetFolder = await getOrCreateFolder(settings.folderNames.assets, vault);
				result = await importBinaryFile(vault, assetFolder, file);
				
			} else if(fileIsBinaryAndSupportedByKeep && !fileIsBinaryAndSupportedByObsidian) {
				// Import as unsupported binary file
				if(!unsupportedFolder) unsupportedFolder = await getOrCreateFolder(settings.folderNames.unsupportedAssets, vault);
				result = await importBinaryFile(vault, unsupportedFolder, file);
				result = {
					keepFilename: file.name,
					outcome: ImportOutcomeType.FormatError,
					details: `This file type isn't supported by Obsidian. The file has been imported into '${settings.folderNames.unsupportedAssets}'. Open that folder outside of Obsidian to convert or deleted those files. Any links to those files in notes will also need to be updated.`,
				}

			} else if(fileIsBinaryAndSupportedByObsidian) {
				// Import as supported binary file
				if(!assetFolder) assetFolder = await getOrCreateFolder(settings.folderNames.assets, vault);
				result = await importBinaryFile(vault, assetFolder, file);

			} else {
				// Import as unrecognised file
				if(!unsupportedFolder) unsupportedFolder = await getOrCreateFolder(settings.folderNames.unsupportedAssets, vault);
				result = await importBinaryFile(vault, unsupportedFolder, file);
				result = {
					keepFilename: file.name,
					outcome: ImportOutcomeType.FormatError,
					details: `This file's format isn't recognised. The file has been imported into '${settings.folderNames.unsupportedAssets}'. It will appear in Obsidian if supported, otherwise you can access it outside of obsidian.`,
				}
			}
	

			// Populate output log on error
			if(result.outcome === ImportOutcomeType.FormatError) {
				this.successCount++;
				this.outputLog.push({
					status: 'Warning',
					title: `${result.keepFilename}`,
					desc: `${result.details} ${result.obsidianFilepath || ''}`,
				})

			} else if(result.outcome === ImportOutcomeType.CreationError || result.outcome === ImportOutcomeType.ContentError) {
				this.failCount++;
				this.outputLog.push({
					status: 'Error',
					title: `${result.keepFilename}`,
					desc: `${result.details} ${result.obsidianFilepath || ''} ${result.error ? '('+result.error+')' : ''}`,
				})

			} else {
				this.successCount++;
			}
	
		}
	
	}

	getTotalImports() {
		return this.totalImports;
	}

	getLatestProgress() {
		let newLogEntries: Array<OutputLogItem> = [];
		if(this.outputLogIter < this.totalImports) {
			newLogEntries = this.outputLog.slice(this.outputLogIter);
			this.outputLogIter += newLogEntries.length;
		}
		return  {
			successCount: this.successCount,
			failCount: this.failCount,
			newLogEntries
		};
	}

	stop() {
		this.activeImport = false;
	}



}







async function importJson(vault: Vault, folder: TFolder, file: File, settings: PluginSettings) : Promise<ImportResult> {
	const result: ImportResult = {
		keepFilename: file.name,
		outcome: ImportOutcomeType.Imported,
	}

	// setting up the reader
	var reader = new FileReader();
	reader.readAsText(file as Blob,'UTF-8');

    // TODO: This composition is confusing - Attempt to simplify
	return new Promise( (resolve, reject) => {

		reader.onerror = reject;
		reader.onload = async (readerEvent) => {

			// Bail if the file hasn't been interpreted properly
			if(!readerEvent || !readerEvent.target) {
				result.outcome = ImportOutcomeType.CreationError;
				result.details = 'Something went wrong reading the file.'
				return resolve(result);
			}
			
			const content: KeepJson = JSON.parse(readerEvent.target.result as string);
			let path: string = `${folder.path}/${filenameSanitize(content.title || file.name)}`;	// TODO: Strip file extension from filename
			let fileRef: TFile;


			// Abort if user doesn't want this type of file
			if(content.isArchived && !settings.importArchived) {
				result.outcome = ImportOutcomeType.UserIgnored;
				result.ignoredReason = IgnoreImportType.Archived;
				return resolve(result);
			}
			if(content.isTrashed && !settings.importTrashed) {
				result.outcome = ImportOutcomeType.UserIgnored;
				result.ignoredReason = IgnoreImportType.Trashed;
				return resolve(result);
			}

			
			// Create new file
			result.obsidianFilepath = path;
			try {
				fileRef = await createNewEmptyMdFile(vault, path, {});
			} catch (error) {
				result.outcome = ImportOutcomeType.CreationError;
				result.error = error;
				result.details = `Error creating equivalent file in obsidian as ${path}`;
				return resolve(result);
			}			
	
			// Add in tags to represent Keep properties
			try {
				settings.addColorTags ?								await vault.append(fileRef, `${settings.tagNames.colorPrepend}${content.color} `) : null;
				content.isPinned && settings.addPinnedTags ?		await vault.append(fileRef, `${settings.tagNames.isPinned} `) :	null;
				content.attachments && settings.addAttachmentTags ?	await vault.append(fileRef, `${settings.tagNames.hasAttachment} `) : null;
				content.isArchived && settings.addArchivedTags ?	await vault.append(fileRef, `${settings.tagNames.isArchived} `) : null;
				content.isTrashed && settings.addTrashedTags ? 		await vault.append(fileRef, `${settings.tagNames.isTrashed} `) : null;
			} catch (error) {
				result.outcome = ImportOutcomeType.ContentError;
				result.error = error;
				result.details = 'Error adding tags to the new file.'
				return resolve(result);
			}
			
			// Add in text content
			try {
				if(content.textContent) {
					await vault.append(fileRef, `\n\n`);
					await vault.append(fileRef, `${content.textContent}\n`);
				}
			} catch (error) {
				result.outcome = ImportOutcomeType.ContentError;
				result.error = error;
				result.details = 'Error adding paragraph content to the new file.'
				return resolve(result);
			}
			
			// Add in text content if check box
			try {
				if(content.listContent) {
					await vault.append(fileRef, `\n\n`);
					for(let i=0; i<content.listContent.length; i++) {
						const listItem = content.listContent[i];
						
						// Skip to next line if this one is blank
						if(!listItem.text) continue;
						
						let listItemContent = `- [${listItem.isChecked ? 'X' : ' '}] ${listItem.text}\n`;
						await vault.append(fileRef, listItemContent);
					}
				}
			} catch (error) {
				result.outcome = ImportOutcomeType.ContentError;
				result.error = error;
				result.details = 'Error adding list content to the new file.'
				return resolve(result);
			}
			
			// Embed attachments
			// NOTE: The files for these may not have been created yet, but since it's just markdown text, they can be created after.
			if(content.attachments) {
				for(let i=0; i<content.attachments.length; i++) {
					const attachment = content.attachments[i];
					try {
						await vault.append(fileRef, `\n\n![[${attachment.filePath}]]`);
					} catch (error) {
						result.outcome = ImportOutcomeType.ContentError;
						result.error = error;
						result.details = `Error embedding attachment '${attachment.filePath}' to the new file.`;
						return resolve(result);
					}
				}
			}

			// Update created and modified date to match Keep data if desired
			if(settings.createdDate === CreatedDateTypes.googleKeep) {
				const options: DataWriteOptions = {
					ctime: content.createdTimestampUsec/1000,
					mtime: content.userEditedTimestampUsec/1000
				}
				await vault.append(fileRef, '', options);
				// await plugin.app.vault.process(fileRef, (str) => str, options);	// TODO: Error in docs. Exists in docs but not in class
			}


			return resolve(result);

	
		 }

	})
	

	
}


async function importBinaryFile(vault: Vault, folder: TFolder, file: File) : Promise<ImportResult> {
    let fileRef: TFile;
	const path: string = `${folder.path}/${file.name}`;
	const result: ImportResult = {
		keepFilename: file.name,
		outcome: ImportOutcomeType.Imported,
	}
	
	try {
		fileRef = await vault.createBinary(path, await file.arrayBuffer());
	} catch (error) {
		result.outcome = ImportOutcomeType.CreationError;
		result.error = error;
		result.details = 'Error creating file in obsidian.';
		return Promise.resolve(result);
	}
    
    return Promise.resolve(result);


}