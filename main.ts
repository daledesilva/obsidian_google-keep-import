import { fileSyntax } from 'esbuild-sass-plugin/lib/utils';
import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, TFolder, Vault } from 'obsidian';



const IMPORT_FOLDER = 'Keep Imports';
const ASSET_FOLDER = 'Attachments'

var plugin: MyPlugin;
var successCount = 0;
var failCount = 0;

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


interface MyPluginSettings {
	hideOpenVaultButton: boolean;
	vaultNames: [string];
	vaultLinks: [string];
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	hideOpenVaultButton: false,
	vaultNames: ['name'],
	vaultLinks: ['utl'],
}



export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();
		plugin = this;	// TODO: Not sure if this is a good idea or not

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Open Philsophy Vault', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('Opening Philosophy Vault');
			window.open('obsidian://vault/Philosophy/');
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');


		
		this.addCommand({
			id: 'ublik-om_import-google-keep-jsons',
			name: 'Import backup from Google Keep',
			callback: () => {
				new StartImportModal(this.app).open();
			}
		});

		
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection('Sample Editor Command');
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class StartImportModal extends Modal {
	result: string;

	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {titleEl, contentEl} = this;

		titleEl.setText('Import Google Keep backup');

		contentEl.createEl('p', {text: 'Here you can upload a set of jsons output from a Google Keep backup.'});
		contentEl.createEl('p', {text: 'Upload each json one at a time or all together. You should also upload any attachments in the backup as well such as png\'s jpgs, etc.'});
		contentEl.createEl('p', {text: 'If you import attachments or jsons separately and close this dialog, they will will automatically link together once their counterparts are imported later provided you haven\'t changed the names of attachments or modified the markdown embeds in the notes.'});

		// new Setting(contentEl)
		// 	.setName("Name")
		// 	.addText((text) =>
		// 		text.onChange((value) => {
		// 		this.result = value
		// 		}));

		// new Setting(contentEl)
		// 	.addColorPicker(color => {});

		// new Setting(contentEl)
		// 	.addExtraButton(btn => {});

		// new Setting(contentEl)
		// 	.addMomentFormat(test => {})

		// new Setting(contentEl)
		// 	.addSearch(test => {});

		// new Setting(contentEl)
		// 	.addSlider(test => {});

		// new Setting(contentEl)
		// 	.addTextArea(test => {});

		const dropFrame = contentEl.createEl('div', {cls: 'uo_drop-frame'});
		const dropFrameText = dropFrame.createEl('p', { text: 'Drag your files here or ' });
		// const linkText = dropFrameText.createEl('a', {text: 'browse local files'})
		dropFrameText.createEl('label', { 
			text: 'browse local files',
			attr: {
				'class': 'uo_file-label',
				'for': 'uo_file',
			}
		})
		const uploadBtn = dropFrameText.createEl('input', { 
			type: 'file',
			attr: {
				'multiple': true,
				'id': 'uo_file',
				'accept': '.json, .jpg, .png, .3gp',
			}
		})

		const modalActions = new Setting(contentEl).addButton(btn => {
			btn.setClass('uo_button');
			btn.setCta();
			btn.setButtonText('Start Import');
			btn.setDisabled(true);
			btn.onClick( (e) => {
				this.close();
				importFiles( Object.values(uploadBtn.files as Object) );
			})
		})

		uploadBtn.addEventListener('change', () => {
			const importBtn = modalActions.components[0];
			importBtn.setDisabled(false);
		});
		

	}

	onClose() {
		const {titleEl, contentEl} = this;
		titleEl.empty();
		contentEl.empty();
	}
}


class ImportProgressModal extends Modal {
	result: string;
	bar: HTMLDivElement;

	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {titleEl, contentEl} = this;

		titleEl.setText('Import in progress');

		const progressBarEl = contentEl.createEl('div', {cls: 'uo_progress-bar'});
		this.bar = progressBarEl.createEl('div', {cls: 'uo_bar'});	
		

	}

	onClose() {
		const {titleEl, contentEl} = this;
		titleEl.empty();
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Settings for my awesome plugin.'});

		new Setting(containerEl)
			.setName('Hide "Open Other Vault" button')
			.setDesc('This will hide the button at the bottom left that returns you to the Vault Selector screen. This is mostly useful for mobile users that find this button disruptive to flow.')
			.addToggle(value => value
				.setValue(this.plugin.settings.hideOpenVaultButton)
				.onChange(async (value) => {
					this.plugin.settings.hideOpenVaultButton = !value;
					await this.plugin.saveSettings();
				}));
	}
}



async function importFiles(files: Array<Object>) {

	const importProgressModal = new ImportProgressModal(plugin.app)
	importProgressModal.open();

	const importFolder = await getImportFolder();
	const assetFolder = await getAssetFolder();

	successCount = 0;
	failCount = 0;

	updateProgressBar({
		total: files.length,
		barEl: importProgressModal.bar,
	})

	for(let i=0; i<files.length; i++) {
		const file = files[i] as File;

		switch(file.type) {
			case 'application/json':	await importJson(file, importFolder);				break;
			case 'image/png':			await importBinaryFile(file, assetFolder);			break;
			case 'video/3gpp':			await importBinaryFile(file, assetFolder);			break;
			case 'image/jpeg':			await importBinaryFile(file, assetFolder);			break;
		}
	}

}


function updateProgressBar(options: {total: number, barEl: HTMLDivElement}) {
	const {total, barEl} = options;

	const perc = (successCount + failCount)/total * 100;
	barEl.setAttr('style', `width: ${perc}%`);

	if(perc == 100) return;	// TODO: Close the modal here

	requestAnimationFrame( function() {
		updateProgressBar(options);
	});
}


async function getImportFolder(): Promise<TFolder> {

	const root = plugin.app.vault.getRoot();
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
		await plugin.app.vault.createFolder(IMPORT_FOLDER);		
		importFolder = await getImportFolder()
	}
	
	return importFolder;
}


async function getAssetFolder(): Promise<TFolder> {

	const importFolder = await getImportFolder()
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
		await plugin.app.vault.createFolder(`${importFolder.path}/${ASSET_FOLDER}`);		
		assetFolder = await getAssetFolder()
	}
	
	return assetFolder;
}



function importJson(file: File, folder: TFolder) {

	// setting up the reader
	var reader = new FileReader();
	reader.readAsText(file as Blob,'UTF-8');

	reader.onload = async (readerEvent) => {

		// Bail if the file hasn't been interpreted properly
		if(!readerEvent || !readerEvent.target) {
			console.error(`Something went wrong reading json: ${file.name}`)
			return;
		}
		
		const content: KeepJson = JSON.parse(readerEvent.target.result as string);
		let path: string = `${folder.path}/${filenameSanitize(content.title || file.name)}`;	// TODO: Strip file extension from filename
		let fileRef: TFile;
		try {

			// Create file
			fileRef = await plugin.app.vault.create(path+'.md', 'test');

			// Add in tags to represent Keep properties
			await plugin.app.vault.append(fileRef, `#Keep/Colour/${content.color} `);
			content.isPinned ?		await plugin.app.vault.append(fileRef, `#Keep/Pinned `) : null;
			content.attachments ?	await plugin.app.vault.append(fileRef, `#Keep/Attachments `) : null;
			content.isArchived ?	await plugin.app.vault.append(fileRef, `#Keep/Archived `) : null;
			content.isTrashed ? 	await plugin.app.vault.append(fileRef, `#Keep/Trashed `) : null;
			await plugin.app.vault.append(fileRef, `\n\n`);

			// Add in text content
			if(content.textContent) {
				await plugin.app.vault.append(fileRef, `${content.textContent}\n`);
			}

			// Add in text content if check box
			if(content.listContent) {
				for(let i=0; i<content.listContent.length; i++) {
					const listItem = content.listContent[i];
					
					// Skip to next line if this one is blank
					if(!listItem.text) continue;

					let listItemContent = `- [${listItem.isChecked ? 'X' : ' '}] ${listItem.text}\n`;
					await plugin.app.vault.append(fileRef, listItemContent);
				}
			}

			// Embed attachments
			// NOTE: The files for these may not have been created yet, but since it's just markdown text, they can be created after.
			if(content.attachments) {
				for(let i=0; i<content.attachments.length; i++) {
					const attachment = content.attachments[i];
					
					console.log('file.name', file.name);
					console.log('attachment.filePath', attachment.filePath);
					await plugin.app.vault.append(fileRef, `\n\n![[${attachment.filePath}]]`);
				}
			}

			successCount++;


		} catch (error) {

			console.log(error)
			failCount++;
		}
		
		

	 }

	/*
	JSON
	//////////
	{
		"color": "DEFAULT",
		"isTrashed": false,
		"isPinned": false,
		"isArchived": true,
		"title": "",
		"userEditedTimestampUsec": 1462811176816000,
		"createdTimestampUsec": 1462763160359000

		"textContent": "",
		OR
		"listContent": [
			{
				"text": "",
				"isChecked": false
			},
			{
				"text": "",
				"isChecked": false
			},
			{
				"text": "175.32.124.133\n",
				"isChecked": false
			}
		],

		OPTIONAL:
		"attachments": [
			{
				"filePath": "16271b560b6.ba20e87f973dd142.png",
				"mimetype": "image/png"
			}
		],
		
	}
	*/
}


async function importBinaryFile(file: File, folder: TFolder) {

	const path: string = `${folder.path}/${file.name}`;
	
	try {
		const fileRef: TFile = await plugin.app.vault.createBinary(path, await file.arrayBuffer());
		successCount++;
	} catch (error) {
		console.log(error)
		failCount++;
		return;
	}

	/*
	Potential formats:
	- jpg
	- jpeg
	- png
	- 3gp (Audio/video recording)
	*/


}



function filenameSanitize(str: string) {

	// Remove /
	let newArr = str.split('/');
	let newStr = newArr.join();

	// Remove \
	newArr = newStr.split('\\');
	newStr = newArr.join();

	// Remove :
	newArr = newStr.split(':');
	newStr = newArr.join();

	return newStr;
}