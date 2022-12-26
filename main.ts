import { fileSyntax } from 'esbuild-sass-plugin/lib/utils';
import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
const { dialog } = require('electron');

// Remember to rename these classes and interfaces!

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
				'accept': '.json',
			}
		})


		uploadBtn.addEventListener('change', () => {
			console.log('uploadBtn.files', uploadBtn.files);
			this.close();
		});
		
// 		<label for="file-upload" class="custom-file-upload">
//     Custom Upload
// </label>
// <input id="file-upload" type="file"/>

		// new Setting(contentEl)
		// 	.addButton((btn) =>
		// 		btn
		// 		.setButtonText("Upload")
		// 		.setCta()
		// 		.onClick(() => {
		// 			// console.log(dialog.showOpenDialog({ properties: ['openFile', 'multiSelections'] }))
		// 			dialog.showOpenDialog({properties: ['openFile'] }).then(function (response) {
		// 				if (!response.canceled) {
		// 					// handle fully qualified file name
		// 				  console.log(response.filePaths[0]);
		// 				} else {
		// 				  console.log("no file selected");
		// 				}
		// 			});
		// 			// this.close();
		// 		}));

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
