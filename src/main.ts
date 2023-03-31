import { Notice, Plugin } from 'obsidian';
import { CreatedDateTypes, PluginSettings } from 'src/types/plugin-settings';
import { runImportSequence } from './logic/import-logic';
import { MySettingsTab } from './tabs/settings-tab/settings-tab';


///////////////////
///////////////////


/**
 * The default settings that a new install starts with
 */
export const DEFAULT_SETTINGS: PluginSettings = {
	folderNames: {
		notes: 'Keep Imports',
		assets: 'Keep Imports/Assets',
		unsupportedAssets: 'Keep Imports/Unsupported Assets'
	},
	createdDate: CreatedDateTypes.googleKeep, 
	importArchived: true,
	importTrashed: false,
	importUnsupported: false,
	importHtml: false,
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


/**
 * The base plugin class initialised by Obsidian on launch
 */
export default class MyPlugin extends Plugin {
	settings: PluginSettings;

	async onload() {
		await this.loadSettings();
		
		this.addCommand({
			id: 'gki_import-files',
			name: 'Import files from Google Keep',
			callback: () => runImportSequence(this)
		});

		this.addSettingTab(new MySettingsTab(this.app, this));
	}

	// Run when deactivating or uninstalling a plugin
	public onunload() {
		// TODO: Double check there isn't anything I need to clean up
	}

	/**
	 * Load any existing plugin settings from Obsidian into the plugins settings object.
	 */
	private async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	/**
	 * Save the plugins settings object to Obsidian.
	 */
	public async saveSettings() {
		await this.saveData(this.settings);
	}

	/**
	 * Reset the plugins settings object back to defaults and save to Obsidian.
	 */
	public async resetSettings() {
		this.settings = JSON.parse( JSON.stringify(DEFAULT_SETTINGS) );
		this.saveSettings();
		new Notice('Google Keep Import settings reset');
	}
}