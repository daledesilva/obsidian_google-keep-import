import { DataWriteOptions, Notice, Plugin, TAbstractFile, TFile, TFolder, Vault } from "obsidian";
import MyPlugin from "src/main";
import { ImportProgressModal } from "src/modals/import-progress-modal/import-progress-modal";
import { filenameSanitize } from "./string-processes";
import { CreatedDateTypes, PluginSettings } from "src/types/PluginSettings";
import { KeepJson } from "src/types/KeepData";
import { IgnoreImportType, ImportResult, ImportOutcomeType } from "src/types/Results";
import { StartImportModal } from "src/modals/start-import-modal/start-import-modal";

// TODO: Put these somewhere
interface ProgressSummary {
	successCount: number,
	failCount: number,
	newLogEntries: Array<OutputLogItem>;
};
interface OutputLogItem {
	status: string;
	title: string;
	desc: string;
}

///////////////////
///////////////////

/**
 * Runs and manages the import sequence of import modals and import logic.
 */
export async function runImportSequence(plugin: MyPlugin) {

	// Allow the user to select which files to import and adjust settings
	const modal = new StartImportModal(plugin);
	let fileBacklog;
	try {
		fileBacklog = await modal.showModal();
	}
	catch {
		// Modal was cancelled
		return;
	}

	// Import the files and show results
	const fileImporter = new FileImporter(plugin);
	fileImporter.import(fileBacklog);
	const progressModal = await new ImportProgressModal(plugin, fileImporter);
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

/**
 * Creates an empty markdown file and returns it. If the file exists already it creates a new one and appends a version number.
 */
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

/**
 * Retrieves a reference to a specific folder in a vault. Creates it first if it doesn't exist.
 */
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

/**
 * Creates an object to manage the importing of files, starts the import, and returns the object.
 */
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

	/**
	 * Begins importing an array of files
	 */
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

			// Bail if the import has been cancelled.
			if(!this.activeImport) return;
	
			if(fileIsJson(file)) {
				// Assume is Google Keep note and attempt to import
				if(!noteFolder) noteFolder = await getOrCreateFolder(settings.folderNames.notes, vault);
				result = await importJson(vault, noteFolder, file, settings);
			
			} else if(fileIsPlainText(file)) {
				// Import as is
				if(!assetFolder) assetFolder = await getOrCreateFolder(settings.folderNames.assets, vault);
				result = await importBinaryFile(vault, assetFolder, file);

			} else if(fileIsBinaryAndSupportedByKeep(file) && fileIsBinaryAndSupportedByObsidian(file)) {
				// Import as supported binary file
				if(!assetFolder) assetFolder = await getOrCreateFolder(settings.folderNames.assets, vault);
				result = await importBinaryFile(vault, assetFolder, file);
				
			} else if(fileIsBinaryAndSupportedByKeep(file) && !fileIsBinaryAndSupportedByObsidian(file)) {
				// Import as unsupported binary file
				if(!unsupportedFolder) unsupportedFolder = await getOrCreateFolder(settings.folderNames.unsupportedAssets, vault);
				result = await importBinaryFile(vault, unsupportedFolder, file);
				result = {
					keepFilename: file.name,
					outcome: ImportOutcomeType.FormatError,
					details: `This file type isn't supported by Obsidian. The file has been imported into '${settings.folderNames.unsupportedAssets}'. Open that folder outside of Obsidian to convert or deleted those files. Any links to those files in notes will also need to be updated.`,
				}

			} else if(fileIsBinaryAndSupportedByObsidian(file)) {
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

	/**
	 * Returns the number of files passed to the object.
	 */
	getTotalImports(): Number {
		return this.totalImports;
	}

	/**
	 * Returns a summary of the import objects progress, including any new output log entries since last call.
	 */
	getLatestProgress(): ProgressSummary {
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

	/**
	 * Stops the active import prematurely.
	 */
	stop() {
		this.activeImport = false;
	}

}

/**
 * Returns if a file is a JSON file.
 */
function fileIsJson(file: File) {
	return file.type === 'application/json';
}

/**
 * Returns if a file is a plain text file.
 * Note that some markdown files have been found to return a blank mime type in testing and maye return false.
 */
function fileIsPlainText(file: File) {
	return	file.type === 'text/plain'		||
			file.type === 'text/markdown'	||
			file.type === 'text/x-markdown';
}

/**
 * Returns if a file is binary and a valid attachment from Google Keep.
 */
function fileIsBinaryAndSupportedByKeep(file: File) {
	return	file.type === 'video/3gpp'	||
			file.type === 'audio/amr'	||
			file.type === 'image/png'	||
			file.type === 'image/jpeg'	||
			file.type === 'image/webp'	||
			file.type === 'image/gif';
}

/**
 * Returns if a file is binary and supported natively by Obsidian.
 * Based on accepted file formats listed here: https://help.obsidian.md/Advanced+topics/Accepted+file+formats
 */
function fileIsBinaryAndSupportedByObsidian(file: File) {
	const isImageFile =	file.type === 'image/png'				||
						file.type === 'image/webp'				||
						file.type === 'image/jpeg'				||	// .jpg or .jpeg
						file.type === 'image/gif'				||
						file.type === 'image/bmp'				||
						file.type === 'image/svg+xml';

	const isAudioFile = file.type === 'audio/mpeg'				||	// .m4a
						file.type === 'audio/m4a'				||	// .m4a
						file.type === 'audio/webm'				||
						file.type === 'audio/wav'				||
						file.type === 'audio/ogg'				||
						file.type === 'audio/3gpp'				||
						file.type === 'audio/x-flac';
	
	const isVideoFile = file.type === 'video/mp4'				||
						file.type === 'video/webm'				||
						file.type === 'video/ogg'				||	// .ogv
						file.type === 'video/3gpp'				||	// .3gp
						file.type === 'video/quicktime'			||	// .mov
						file.type === 'video/x-matroska';			// .mkv

	const isOtherFile = file.type === 'application/pdf';

	return isImageFile || isAudioFile || isVideoFile || isOtherFile;
}

/**
 * Reads a Google Keep JSON file and creates a markdown note from it in the Obsidian vault.
 */
async function importJson(vault: Vault, folder: TFolder, file: File, settings: PluginSettings) : Promise<ImportResult> {
	const result: ImportResult = {
		keepFilename: file.name,
		outcome: ImportOutcomeType.Imported,
	}

    // TODO: This composition is confusing - Attempt to simplify
	return new Promise( (resolve, reject) => {


		// TODO: Refactor this as a parseKeepJson function that we wait for.
		// setting up the reader
		var reader = new FileReader();
		reader.readAsText(file as Blob,'UTF-8');
		reader.onerror = reject;
		reader.onload = async (readerEvent) => {

			// Bail if the file hasn't been interpreted properly
			if(!readerEvent || !readerEvent.target) {
				result.outcome = ImportOutcomeType.CreationError;
				result.details = 'Something went wrong reading the file.'
				return resolve(result);
			}
			
			const content: KeepJson = JSON.parse(readerEvent.target.result as string);
			// TODO: resolve with error if file is not Keep Json





			// TODO: Refactor this as IsUserAcceptedType function
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



			
			const path = `${folder.path}/${filenameSanitize(content.title || file.name)}`;	// TODO: Strip file extension from filename



			// TODO: Refactor this as createNewMarkdownFile function
			// Create new file
			result.obsidianFilepath = path;
			let fileRef: TFile;
			try {
				fileRef = await createNewEmptyMdFile(vault, path, {});
			} catch (error) {
				result.outcome = ImportOutcomeType.CreationError;
				result.error = error;
				result.details = `Error creating equivalent file in obsidian as ${path}`;
				return resolve(result);
			}
		


			// TODO: Refactor this as appendKeepTags function
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
				


			// TODO: Refactor this as appendTextContent
			// Add in text content
			try {
				if(content.textContent) {	// TODO: Make this a bail line without error
					await vault.append(fileRef, `\n\n`);
					await vault.append(fileRef, `${content.textContent}\n`);
				}
			} catch (error) {
				result.outcome = ImportOutcomeType.ContentError;
				result.error = error;
				result.details = 'Error adding paragraph content to the new file.'
				return resolve(result);
			}
				

			// TODO: Refactor this as appendListContent function
			// Add in text content if check box
			try {
				if(content.listContent) {	// TODO: Make this a bail line without error
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
			


			// TODO: Refactor this as appendAttachments function
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



			// TODO: Refactor this as resetModifiedDate function
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

/**
 * Recreates any binary file in the Obsidian vault.
 */
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