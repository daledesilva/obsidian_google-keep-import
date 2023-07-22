import { DataWriteOptions, Notice, Plugin, TAbstractFile, TFile, TFolder, Vault } from "obsidian";
import GoogleKeepImportPlugin from "src/main";
import { ImportProgressModal } from "src/modals/import-progress-modal/import-progress-modal";
import { filenameSanitize, getFileExtension } from "./string-processes";
import { CreatedDateTypes, PluginSettings } from "src/types/plugin-settings";
import { KeepJson, objectIsKeepJson } from "src/types/keep-data";
import { IgnoreImportReason, ImportResult, LogStatus as LogStatus } from "src/types/results";
import { StartImportModal } from "src/modals/start-import-modal/start-import-modal";


///////////////////
///////////////////


interface ProgressSummary {
	successCount: number,
	skipCount: number,
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
export async function runImportSequence(plugin: GoogleKeepImportPlugin) {

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

	try {
		const folder = vault.getAbstractFileByPath(folderPath);
		if (folder instanceof TFolder) {
			return folder;
		} else {
			await vault.createFolder(folderPath);
			return vault.getAbstractFileByPath(folderPath) as TFolder;	
		}

	} catch(e) {
		const message = `There was an error creating folder '${folderPath}' (${e})`
		new Notice(message, 9000);
		throw new Error(`There was an error creating folder '${folderPath}' (${e})`);
	}

}

/**
 * Creates an object to manage the importing of files, starts the import, and returns the object.
 */
export class FileImporter {
	private plugin: GoogleKeepImportPlugin;
	private totalImports = 0;
	private successCount = 0;
	private failCount = 0;
	private skipCount = 0;
	private activeImport = false;
	private outputLog: Array<OutputLogItem> = [];
	private outputLogIter = 0;

	constructor(plugin: GoogleKeepImportPlugin) {
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
		this.skipCount = 0;
		
		for(let i=0; i<files.length; i++) {
			const file = files[i] as File;
			let result: ImportResult;

			// Bail if the import has been cancelled.
			if(!this.activeImport) return;
	
			if(fileIsJson(file)) {
				// Assume is Google Keep note and attempt to import
				if(!noteFolder) noteFolder = await getOrCreateFolder(settings.folderNames.notes, vault);
				result = await importJson(vault, noteFolder, file, settings);
			
			} else if(fileIsMarkdown(file)) {
				// Import as is
				if(!assetFolder) assetFolder = await getOrCreateFolder(settings.folderNames.assets, vault);
				result = await importBinaryFile(vault, assetFolder, file);

			} else if(fileIsBinaryAndSupportedByObsidian(file)) {
				// Import as supported binary file
				if(!assetFolder) assetFolder = await getOrCreateFolder(settings.folderNames.assets, vault);
				result = await importBinaryFile(vault, assetFolder, file);

			} else {
				const fileIsHtmlAndValidImport = fileIsHtml(file) && settings.importUnsupported && settings.importHtml;
				const fileIsOtherAndValidImport = !fileIsHtml(file) && settings.importUnsupported;
				if(fileIsHtmlAndValidImport || fileIsOtherAndValidImport) {
					// Import as unsupported binary file
					if(!unsupportedFolder) unsupportedFolder = await getOrCreateFolder(settings.folderNames.unsupportedAssets, vault);
					result = await importBinaryFile(vault, unsupportedFolder, file);
					if(result.logStatus === LogStatus.Success) {
						result.logStatus = LogStatus.Warning;
						result.details = `This file type isn't supported by Obsidian. The file has been imported into '${settings.folderNames.unsupportedAssets}'. Open that folder outside of Obsidian to convert or deleted those files. Any links to those files in notes will also need to be updated.`;
					}
				} else {
					// Don't import unsupported binary file, but still log
					result = {
						keepFilename: file.name,
						logStatus: LogStatus.Note,
						details: `This file type isn't supported by Obsidian and has been skipped. You can change this behaviour in the settings.`,
					}
				}
			}

			this.updateOutputLog(result);
	
		}
	
	}

	/**
	 * Updates the passes the result into the output log of the file loader object.
	 */
	private updateOutputLog(result: ImportResult) {
		if(result.logStatus === LogStatus.Warning) {
			this.successCount++;
			this.outputLog.push({
				status: 'Warning',
				title: `${result.keepFilename}`,
				desc: `${result.details} ${result.obsidianFilepath || ''}`,
			})

		} else if(result.logStatus === LogStatus.Error) {
			this.failCount++;
			this.outputLog.push({
				status: 'Error',
				title: `${result.keepFilename}`,
				desc: `${result.details} ${result.obsidianFilepath || ''} ${result.error ? '('+result.error+')' : ''}`,
			})
			
		} else if(result.logStatus === LogStatus.Note) {
			this.skipCount++;
			this.outputLog.push({
				status: 'Note',
				title: `${result.keepFilename}`,
				desc: `${result.details} ${result.error ? '('+result.error+')' : ''}`,
			})

		} else {
			this.successCount++;
		}
	}

	/**
	 * Returns the number of files passed to the object.
	 */
	public getTotalImports(): number {
		return this.totalImports;
	}

	/**
	 * Returns a summary of the import objects progress, including any new output log entries since last call.
	 */
	public getLatestProgress(): ProgressSummary {
		let newLogEntries: Array<OutputLogItem> = [];
		if(this.outputLogIter < this.totalImports) {
			newLogEntries = this.outputLog.slice(this.outputLogIter);
			this.outputLogIter += newLogEntries.length;
		}
		return  {
			successCount: this.successCount,
			failCount: this.failCount,
			skipCount: this.skipCount,
			newLogEntries
		};
	}

	/**
	 * Stops the active import prematurely.
	 */
	public stop() {
		this.activeImport = false;
	}

}

/**
 * Returns if a file is a JSON file.
 */
export function fileIsJson(file: File) {
	return getFileExtension(file.name) === '.json' || file.type === 'application/json';
}

/**
 * Returns if a file is a a markdown text file. Whether by mimetype or by file extension.
 * File extension is also used because some seem to return a blank mime-type.
 */
function fileIsMarkdown(file: File) {
	return	getFileExtension(file.name)  === '.md'					||
			file.type === 'text/markdown'	||
			file.type === 'text/x-markdown';
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
 * Returns if a file is an html file. Whether by mimetype or by file extension.
 */
function fileIsHtml(file: File) {
	const ext = getFileExtension(file.name);
	return	ext === 'html'						||
			ext === 'htm'						||
			file.type === 'text/html';

}

/**
 * Reads a Google Keep JSON file and creates a markdown note from it in the Obsidian vault.
 */
async function importJson(vault: Vault, folder: TFolder, file: File, settings: PluginSettings) : Promise<ImportResult> {
	const result: ImportResult = {
		keepFilename: file.name,
		logStatus: LogStatus.Success,
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
				result.logStatus = LogStatus.Error;
				result.details = 'Something went wrong reading the file.'
				return resolve(result);
			}
			

			// Bail if the file has been read correctly but is malformed
			let content: KeepJson | undefined;
			try {
				content = JSON.parse(readerEvent.target.result as string) as KeepJson;
			} catch(e) {
				console.log(e);
				result.logStatus = LogStatus.Error;
				result.details = `<p>JSON file appears to be malformed and can't be imported. You can open this file and either attempt to correct and reimport it, or to copy it's contents manually.</p>
				<p><a href="https://www.toptal.com/developers/json-formatter">Toptal JSON Formatter</a> can help to find errors and format JSON data for easier manual copying. Open the file in a text editor (or drag it into a browser tab), to copy the contents into the formatter.</p>`;
				return resolve(result);
			}
		

			// Bail if the file has been read correctly but doesn't match the expected Keep format
			if(!objectIsKeepJson(content)) {
				result.logStatus = LogStatus.Error;
				result.details = `JSON file doesn't match the expected Google Keep format.`;
				return resolve(result);
			}


			// TODO: Refactor this as IsUserAcceptedType function
			// Abort if user doesn't want this type of file
			if(content.isArchived && !settings.importArchived) {
				result.logStatus = LogStatus.Note;
				result.ignoredReason = IgnoreImportReason.Archived;
				return resolve(result);
			}
			if(content.isTrashed && !settings.importTrashed) {
				result.logStatus = LogStatus.Note;
				result.ignoredReason = IgnoreImportReason.Trashed;
				return resolve(result);
			}

			
			// TODO: Strip file extension from filename
			const path = `${folder.path}/${filenameSanitize(content.title || file.name)}`;


			// TODO: Refactor this as createNewMarkdownFile function
			// Create new file
			result.obsidianFilepath = path;
			let fileRef: TFile;
			try {
				fileRef = await createNewEmptyMdFile(vault, path, {});
			} catch (error) {
				result.logStatus = LogStatus.Error;
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
				result.logStatus = LogStatus.Error;
				result.error = error;
				result.details = 'Error adding tags to the new file.'
				return resolve(result);
			}


			// Add in tags to represent Keep properties
			try {
				appendKeepLabels(fileRef, content, settings, vault);
			} catch (error) {
				result.logStatus = LogStatus.Error;
				result.error = error;
				result.details = 'Error adding labels to the new file.'
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
				result.logStatus = LogStatus.Error;
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
				result.logStatus = LogStatus.Error;
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
						result.logStatus = LogStatus.Error;
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
 * Adds labels found in the Google Keep file to the passed in markdown file.
 */
async function appendKeepLabels(fileRef: TFile, content: KeepJson, settings: PluginSettings, vault: Vault) {
	if(!settings.addLabelTags) return;
	if(!content.labels) return;

	let labels = "";
	for(let i=0; i<content.labels.length; i++) {
		if(i > 0) labels += ' ';
		labels += settings.tagNames.labelPrepend + content.labels[i].name;
	}
	await vault.append(fileRef, labels);
}



/**
 * Recreates any binary file in the Obsidian vault.
 */
async function importBinaryFile(vault: Vault, folder: TFolder, file: File) : Promise<ImportResult> {
    let fileRef: TFile;
	const path: string = `${folder.path}/${file.name}`;
	const result: ImportResult = {
		keepFilename: file.name,
		logStatus: LogStatus.Success,
	}
	
	try {
		fileRef = await vault.createBinary(path, await file.arrayBuffer());
	} catch (error) {
		result.logStatus = LogStatus.Error;
		result.error = error;
		result.details = 'Error creating file in obsidian.';
		return Promise.resolve(result);
	}
    
    return Promise.resolve(result);
}

