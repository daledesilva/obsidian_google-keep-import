import { fileSyntax } from 'esbuild-sass-plugin/lib/utils';
import { App, DataWriteOptions, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, TFolder, Vault } from 'obsidian';
import { CreatedDateTypes, PluginSettings } from 'src/types/PluginSettings';
import { StartImportModal } from './modals/import-modal/import-modal';
import { SampleSettingTab } from './tabs/settings-tab/settings-tab';




export const DEFAULT_SETTINGS: PluginSettings = {
	folderNames: {
		notes: 'Keep Imports',
		attachments: 'Keep Imports/Attachments'
	},
	createdDate: CreatedDateTypes.googleKeep, 
	importArchived: true,
	importTrashed: false,
	addColorTags: true,
	addPinnedTags: true,
	addAttachmentTags: true,
	addArchivedTags: true,
	addTrashedTags: true,
	tagNames: {
		colorPrepend: '#Keep/Colour/',
		isPinned: '#Keep/Pinned',
		hasAttachment: '#Keep/Attachments',
		isArchived: '#Keep/Archived',
		isTrashed: '#Keep/Trashed',
	},
}




export default class KeepPlugin extends Plugin {
	settings: PluginSettings;

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


