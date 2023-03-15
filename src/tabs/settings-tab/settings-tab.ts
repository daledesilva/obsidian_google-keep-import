import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import { CreatedDateTypes } from "src/types/PluginSettings";
import MyPlugin, { DEFAULT_SETTINGS } from "src/main";
import { ConfirmationModal } from "src/modals/confirmation-modal/confirmation-modal";
import { resetSettings } from "src/logic/admin-logic";
import { AddBasicSettings, AddInclusionSettings, AddSettingsButtons, AddTagSettings } from "src/components/settings-groups/settings-groups";



export class MySettingsTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;
		containerEl.empty();

		containerEl.createEl('h1', {text: 'Google Keep Import Plugin'});
		containerEl.createEl('p', {text: 'This plugin allows importing notes from Google keep as a one time operation.'});
		
		containerEl.createEl('hr');
		containerEl.createEl('h2', {text: 'Basics'});
		AddBasicSettings(containerEl, this.plugin);
		
		containerEl.createEl('hr');
		containerEl.createEl('h2', {text: 'Inclusions'});
		AddInclusionSettings(containerEl, this.plugin);
		
		containerEl.createEl('hr');
		containerEl.createEl('h2', {text: 'Tags'});
		AddTagSettings(containerEl, this.plugin);

		containerEl.createEl('hr');
		AddSettingsButtons(containerEl, this.plugin);

	}
}