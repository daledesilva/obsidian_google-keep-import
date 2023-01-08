import { App, PluginSettingTab, Setting } from "obsidian";
import MyPlugin from "src/main";



export class SampleSettingTab extends PluginSettingTab {
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


	}
}