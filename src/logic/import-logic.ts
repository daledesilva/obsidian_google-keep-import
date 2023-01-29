import { DataWriteOptions, Plugin, TAbstractFile, TFile, TFolder, Vault } from "obsidian";
import KeepPlugin from "src/main";
import { ImportProgressModal, updateProgress } from "src/modals/import-progress-modal/import-progress-modal";
import { filenameSanitize } from "./string-processes";
import { CreatedDateTypes, PluginSettings } from "./types";






// Types definitions
////////////////////


interface KeepListItem {
	text: string;
	isChecked: boolean;
}

interface KeepAttachment {
	filePath: string;
	mimetype: string;
}

interface KeepJson {
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

	const importFolder = await getOrCreateFolder(settings.folderNames.notes, vault);
	const assetFolder = await getOrCreateFolder(settings.folderNames.attachments, vault);	// TODO: Only do this if there is an attachement to be imported

	let successCount = 0;
	let failCount = 0;

	updateProgress({
        successCount,
        failCount,
		totalImports: files.length,
		modal: importProgressModal,
	})

	for(let i=0; i<files.length; i++) {
		const file = files[i] as File;
        let fileRef: TFile | null | Error;

        if(file.type === 'image/png') {
            fileRef = await importBinaryFile(vault, assetFolder, file);
            
        } else if(file.type === 'video/3gpp') {
            fileRef = await importBinaryFile(vault, assetFolder, file);
            
        } else if(file.type === 'image/jpeg') {
            fileRef = await importBinaryFile(vault, assetFolder, file);
            
        } else { // file.type === 'application/json'
            fileRef = await importJson(vault, importFolder, file, settings);

        }

        if(fileRef instanceof Error || fileRef ===  null) {
            failCount++;
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






async function importJson(vault: Vault, folder: TFolder, file: File, settings: PluginSettings) : Promise<TFile | null> {

	// setting up the reader
	var reader = new FileReader();
	reader.readAsText(file as Blob,'UTF-8');

    // TODO: This composition is confusing - Attempt to simplify
	return new Promise( (resolve, reject) => {

		reader.onerror = reject;
		reader.onload = async (readerEvent) => {

			// Bail if the file hasn't been interpreted properly
			if(!readerEvent || !readerEvent.target) {
				return reject(new Error(`Something went wrong reading json: ${file.name}`));
			}
			
			const content: KeepJson = JSON.parse(readerEvent.target.result as string);
			let path: string = `${folder.path}/${filenameSanitize(content.title || file.name)}`;	// TODO: Strip file extension from filename
			let fileRef: TFile;


			// Abort if user doesn't want this type of file
			if(content.isArchived && !settings.importArchived) {
				return resolve(null);
			}
			if(content.isTrashed && !settings.importTrashed) {
				return resolve(null);
			}

			
			// Create new file
			try {
				fileRef = await createNewEmptyMdFile(vault, path, {});
			} catch (error) {
				return reject(new Error(`Error creating new file ${path} (from ${file.name}. Error: ${error})`));
			}			
	
			// Add in tags to represent Keep properties
			try {
				settings.addColorTags ?								await vault.append(fileRef, `${settings.tagNames.colorPrepend}${content.color} `) : null;
				content.isPinned && settings.addPinnedTags ?		await vault.append(fileRef, `${settings.tagNames.isPinned} `) :	null;
				content.attachments && settings.addAttachmentTags ?	await vault.append(fileRef, `${settings.tagNames.hasAttachment} `) : null;
				content.isArchived && settings.addArchivedTags ?	await vault.append(fileRef, `${settings.tagNames.isArchived} `) : null;
				content.isTrashed && settings.addTrashedTags ? 		await vault.append(fileRef, `${settings.tagNames.isTrashed} `) : null;
			} catch (error) {
				return reject(Error(`Error adding tags to new file ${path} (from ${file.name})`));
			}
			
			// Add in text content
			try {
				if(content.textContent) {
					await vault.append(fileRef, `\n\n`);
					await vault.append(fileRef, `${content.textContent}\n`);
				}
			} catch (error) {
				return reject(new Error(`Error adding paragraph content to new file ${path} (from ${file.name})`));
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
				return reject(new Error(`Error adding list content to new file ${path} (from ${file.name})`));
			}
			
			// Embed attachments
			// NOTE: The files for these may not have been created yet, but since it's just markdown text, they can be created after.
			if(content.attachments) {
				for(let i=0; i<content.attachments.length; i++) {
					const attachment = content.attachments[i];
					try {
						await vault.append(fileRef, `\n\n![[${attachment.filePath}]]`);
					} catch (error) {
						return reject(new Error(`Error embedding attachment ${attachment.filePath} to new file ${path} (from ${file.name})`));
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


			return resolve(fileRef);

	
		 }

	})
	

	
}


async function importBinaryFile(vault: Vault, folder: TFolder, file: File) : Promise<TFile> {
    let fileRef: TFile;
	const path: string = `${folder.path}/${file.name}`;
	
	try {
		fileRef = await vault.createBinary(path, await file.arrayBuffer());
	} catch (error) {
		return Promise.reject(new Error(`Error creating attachment (Binary file) ${path} (from ${file.name})`));
	}
    
    return Promise.resolve(fileRef);


}