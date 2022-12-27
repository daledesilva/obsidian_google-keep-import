import { fileSyntax } from 'esbuild-sass-plugin/lib/utils';
import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, TFolder, Vault } from 'obsidian';



const IMPORT_FOLDER = 'Keep Imports';

var plugin: MyPlugin;


interface KeepListItem {
	text: string;
	isChecked: boolean;
}
interface KeepJson {
	color: string;
	createdTimestampUsec: number;
	isArchived: boolean;
	isPinned: boolean;
	isTrashed: boolean;
	textContent?: string;
	listContent?: Array<KeepListItem>;
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
				new OpenImportDialog(this.app).open();
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

class OpenImportDialog extends Modal {
	result: string;

	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Upload a set of jsons output from a Google Keep backup');

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


		uploadBtn.addEventListener('change', () => {
			importFiles( Object.values(uploadBtn.files as Object) );	// TODO: Need to respond to this finishing as it's calliung an async function
			this.close();
		});
		

	}

	onClose() {
		const {contentEl} = this;
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
	const folder = await getFolder();	

	files.forEach( (file: File) => {
		switch(file.type) {
			case 'application/json':	importJson(file, folder);			break;
			case 'application/jpg':		importAttachment(file, folder);		break;
			case 'application/png':		importAttachment(file, folder);			break;
			case 'application/3gp':		importAttachment(file, folder);			break;
		}
	})

}


async function getFolder(): Promise<TFolder> {

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
		importFolder = await getFolder()
	}
	
	return importFolder;
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
		const path: string = `${folder.path}/${content.title || file.name}`;
		const fileRef: TFile = await plugin.app.vault.create(path+'.md', '');
		await plugin.app.vault.append(fileRef, `#Keep/Colour/${content.color} `);
		content.isPinned ?		await plugin.app.vault.append(fileRef, `#Keep/Pinned `) : null;
		content.isArchived ?	await plugin.app.vault.append(fileRef, `#Keep/Archived `) : null;
		content.isTrashed ? 	await plugin.app.vault.append(fileRef, `#Keep/Trashed `) : null;
		await plugin.app.vault.append(fileRef, `\n\n`);

		if(content.textContent) {
			await plugin.app.vault.append(fileRef, `${content.textContent}\n`);
		}
		if(content.listContent) {
			for(let i=0; i<content.listContent.length; i++) {
				const listItem = content.listContent[i];
				
				// Skip to next line if this one is blank
				if(!listItem.text) continue;
				
				let listItemContent = `- [${listItem.isChecked ? 'X' : ' '}] ${listItem.text}\n`;
				await plugin.app.vault.append(fileRef, listItemContent);
			}
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


function importAttachment(file: Object, folder: TFolder) {
		/*
		Potential formats:
		- jpg
		- jpeg
		- png
		- 3gp (Audio recording)
		- mp4??
		- mov??
		*/


}