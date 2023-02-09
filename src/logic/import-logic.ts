import { DataWriteOptions, Plugin, TAbstractFile, TFile, TFolder, Vault } from "obsidian";
import KeepPlugin from "src/main";
import { addOutputLine, ImportProgressModal, updateProgress } from "src/modals/import-progress-modal/import-progress-modal";
import { KeepListItem } from "src/types/KeepData";
import { filenameSanitize } from "./string-processes";
import { CreatedDateTypes, PluginSettings } from "src/types/PluginSettings";
import { KeepAttachment, KeepJson } from "src/types/KeepData";
import { IgnoreImportType, ImportResult, ImportOutcomeType } from "src/types/Results";



















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






export async function importFiles(plugin: KeepPlugin, files: Array<Object>) {
	const vault = plugin.app.vault;
	const settings = plugin.settings;

	const importProgressModal = new ImportProgressModal(plugin)
	importProgressModal.open();

	let noteFolder, assetFolder;
	let successCount = 0;
	let failCount = 0;

	updateProgress({
        successCount,
        failCount,
		totalImports: files.length,
		modal: importProgressModal,
	})

	// try {
	// 	for(let i=0; i<files.length; i++) {
	// 		const file = files[i] as File;

	// 		const isNote = file.type === 'application/json';
	// 		if(isNote && noteFolder === undefined) {
	// 			noteFolder = await getOrCreateFolder(settings.folderNames.notes, vault);
			
	// 		} else if (!isNote && assetFolder === undefined) {
	// 			assetFolder = await getOrCreateFolder(settings.folderNames.attachments, vault);
	// 		}
	// 	}
	// } catch(error) {
	// 	addOutputLine({
	// 		status: 'Error',
	// 		title: `Error creating folders`,
	// 		desc: `Couldn't create required Obsidian folders (${error})`,
	// 		modal: importProgressModal,
	// 	})
	// 	return;
	// }

	for(let i=0; i<files.length; i++) {
		const file = files[i] as File;
        let result: ImportResult;

		if(file.type === 'application/json') {
			if(!noteFolder) noteFolder = await getOrCreateFolder(settings.folderNames.notes, vault);
            result = await importJson(vault, noteFolder, file, settings);
        } else if(	file.type === 'video/3gpp'	||
					file.type === 'audio/amr'	||
					file.type === 'image/png'	||
					file.type === 'image/jpeg'	||
					file.type === 'image/jpg'	||
					file.type === 'image/webp'	||
					file.type === 'image/gif'
		) {
			if(!assetFolder) assetFolder = await getOrCreateFolder(settings.folderNames.attachments, vault);
            result = await importBinaryFile(vault, assetFolder, file);
		} else {
			result = {
				keepFilename: file.name,
				outcome: ImportOutcomeType.CreationError,
				details: `This file wasn't imported because this plugin doesn\'t support importing ${file.type} files.`,
			}
		}

		// Populate output log on error
        if(result.outcome === ImportOutcomeType.CreationError || result.outcome === ImportOutcomeType.ContentError) {
			failCount++;
			addOutputLine({
				status: 'Error',
				title: `${result.keepFilename}`,
				desc: `${result.details} ${result.obsidianFilepath || ''} (${result.error})`,
				modal: importProgressModal,
			})
        } else {
            successCount++;
        }
		
		updateProgress({
			successCount,
			failCount,
			totalImports: files.length,
			modal: importProgressModal,
		})

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