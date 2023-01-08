import { fileSyntax } from 'esbuild-sass-plugin/lib/utils';
import { App, DataWriteOptions, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, TFolder, Vault } from 'obsidian';
import { MyPluginSettings } from './logic/types';
import { StartImportModal } from './modals/import-modal/import-modal';
import { SampleSettingTab } from './tabs/settings-tab/settings-tab';




// TODO: Put these inside the plugin settings
export const IMPORT_FOLDER = 'Keep Imports';
export const ASSET_FOLDER = 'Attachments'

const DEFAULT_SETTINGS: MyPluginSettings = {
	hideOpenVaultButton: false,
	vaultNames: ['name'],
	vaultLinks: ['utl'],
}



export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();

		
		this.addCommand({
			id: 'ublik-om_import-google-keep-jsons',
			name: 'Import backup from Google Keep',
			callback: () => {
				new StartImportModal(this).open();
			}
		});

		
		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		// this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
		// 	console.log('click', evt);
		// });

	}

	onunload() {
		// TODO: Make sure to stop anything here

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}


