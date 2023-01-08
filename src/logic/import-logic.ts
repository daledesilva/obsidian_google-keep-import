import { DataWriteOptions, TFile, TFolder, Vault } from "obsidian";
import MyPlugin, { ASSET_FOLDER, IMPORT_FOLDER } from "src/main";
import { ImportProgressModal, updateProgress } from "src/modals/import-progress-modal/import-progress-modal";
import { filenameSanitize } from "./string-processes";






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





async function getImportFolder(vault: Vault): Promise<TFolder> {

	const root = vault.getRoot();
	let importFolder: TFolder | undefined;

	// Find the folder if it exists
	for(let i=0; i<root.children.length; i++) {
		if(root.children[i].path == IMPORT_FOLDER) {
			importFolder = root.children[i] as TFolder;
			break;
		}
	}
	
	// Create the folder if it doesn't exist
	if(importFolder === undefined) {
		await vault.createFolder(IMPORT_FOLDER);		
		importFolder = await getImportFolder(vault)
	}
	
	return importFolder;
}





async function getAssetFolder(vault: Vault): Promise<TFolder> {

	const importFolder = await getImportFolder(vault)
	let assetFolder: TFolder | undefined;

	// Find the folder if it exists
	for(let i=0; i<importFolder.children.length; i++) {
		if(importFolder.children[i].name == ASSET_FOLDER) {
			assetFolder = importFolder.children[i] as TFolder;
			break;
		}
	}
	
	// Create the folder if it doesn't exist
	if(assetFolder === undefined) {
		await vault.createFolder(`${importFolder.path}/${ASSET_FOLDER}`);		
		assetFolder = await getAssetFolder(vault)
	}
	
	return assetFolder;
}






export async function importFiles(plugin: MyPlugin, files: Array<Object>) {

	const importProgressModal = new ImportProgressModal(plugin)
	importProgressModal.open();

	const importFolder = await getImportFolder(plugin.app.vault);
	const assetFolder = await getAssetFolder(plugin.app.vault);	// TODO: Only do this if there is an attachement to be imported

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
        let fileRef: TFile | Error;

        if(file.type === 'image/png') {
            fileRef = await importBinaryFile(plugin.app.vault, assetFolder, file);
            
        } else if(file.type === 'video/3gpp') {
            fileRef = await importBinaryFile(plugin.app.vault, assetFolder, file);
            
        } else if(file.type === 'image/jpeg') {
            fileRef = await importBinaryFile(plugin.app.vault, assetFolder, file);
            
        } else { // file.type === 'application/json'
            fileRef = await importJson(plugin.app.vault, importFolder, file);

        }

        if(fileRef instanceof Error) {
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






async function importJson(vault: Vault, folder: TFolder, file: File) : Promise<TFile> {

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

			
			// Create new file
			try {
				// path = await getUnusedFilename(path);
				// fileRef = await plugin.app.vault.create(`${path}.md`, '');
				fileRef = await createNewEmptyMdFile(vault, path, {});
			} catch (error) {
				return reject(new Error(`Error creating new file ${path} (from ${file.name}. Error: ${error})`));
			}			
	
			// Add in tags to represent Keep properties
			try {
				await vault.append(fileRef, `#Keep/Colour/${content.color} `);
				content.isPinned ?		await vault.append(fileRef, `#Keep/Pinned `) : null;
				content.attachments ?	await vault.append(fileRef, `#Keep/Attachments `) : null;
				content.isArchived ?	await vault.append(fileRef, `#Keep/Archived `) : null;
				content.isTrashed ? 	await vault.append(fileRef, `#Keep/Trashed `) : null;
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

			// Update created and modified date to match Keep data
			const options: DataWriteOptions = {
				ctime: content.createdTimestampUsec/1000,
				mtime: content.userEditedTimestampUsec/1000
			}
			await vault.append(fileRef, '', options);
			// await plugin.app.vault.process(fileRef, (str) => str, options);	// In docs, but not in class


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