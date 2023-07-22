import { App, PluginSettingTab, Setting } from "obsidian";
import GoogleKeepImportPlugin from "src/main";
import { addResetButton, BasicSettingsGroup, CharMappingGroup, InclusionSettingsGroup, TagSettingsGroup } from "src/components/settings-groups/settings-groups";
import { SupportButtonSet } from "src/components/support-button-set/support-button-set";


///////////////////
///////////////////


export class MySettingsTab extends PluginSettingTab {
	plugin: GoogleKeepImportPlugin;

	constructor(app: App, plugin: GoogleKeepImportPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;
		containerEl.empty();

		containerEl.createEl('h1', {text: 'Google Keep Import Settings'});
		containerEl.createEl('p', {text: 'All settings will save immediately. Close this modal to return to your import.'});
		
		containerEl.createEl('hr');
		new BasicSettingsGroup(containerEl, this.plugin);
		
		containerEl.createEl('hr');
		new InclusionSettingsGroup(containerEl, this.plugin);
		
		containerEl.createEl('hr');
		new TagSettingsGroup(containerEl, this.plugin);
		
		containerEl.createEl('hr');
		new CharMappingGroup(containerEl, this.plugin, () => this.display());

		containerEl.createEl('hr');
		const modalActions = new Setting(containerEl);
		new SupportButtonSet(modalActions);
		addResetButton(modalActions, this.plugin, () => this.display());
	}
}