import { App, PluginSettingTab, Setting } from "obsidian";
import MyPlugin from "src/main";
import { AddBasicSettings, AddInclusionSettings, addResetButton, AddTagSettings } from "src/components/settings-groups/settings-groups";
import { SupportButtonSet } from "src/components/support-button-set/support-button-set";


///////////////////
///////////////////


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
		const headerActions = new Setting(containerEl);
		new SupportButtonSet(headerActions);
		
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
		const modalActions = new Setting(containerEl);
		addResetButton(modalActions, this.plugin, () => this.display());
	}
}