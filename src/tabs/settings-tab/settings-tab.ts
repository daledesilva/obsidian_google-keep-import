import { App, PluginSettingTab, Setting } from "obsidian";
import { createdDateTypes } from "src/logic/types";
import MyPlugin, { DEFAULT_SETTINGS } from "src/main";



export class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h1', {text: 'Keep Import Plugin'});
		containerEl.createEl('p', {text: 'This plugin allows importing notes from Google keep as a one time operation.'});

		
		containerEl.createEl('hr');
		containerEl.createEl('h2', {text: 'Basics'});
	
			
		new Setting(containerEl)
			.setClass('uo_setting')
			.setName('Note import folder')
			.addText((text) => {
				text.setValue(this.plugin.settings.folderNames.notes);
				text.onChange(async (value) => {
					this.plugin.settings.folderNames.notes = value;
					await this.plugin.saveSettings();
				});
			});
			
		new Setting(containerEl)
			.setClass('uo_setting')
			.setName('Attachment import folder')
			.addText((text) => {
				text.setValue(this.plugin.settings.folderNames.attachments);
				text.onChange(async (value) => {
					this.plugin.settings.folderNames.attachments = value;
					await this.plugin.saveSettings();
				});
			});
						
		new Setting(containerEl)
			.setClass('uo_setting')
			.setName('Note creation date')
			.setDesc('Should the imported not have a creation date set to the same date it was created on in Google Keep, or should it change to the date it was imported into Obsidian on?')
			.addDropdown((dropdown) => {
				dropdown.addOption(createdDateTypes.googleKeep, createdDateTypes.googleKeep);
				dropdown.addOption(createdDateTypes.import, createdDateTypes.import);
				dropdown.setValue(this.plugin.settings.createdDate)
				dropdown.onChange(async (value) => {
					this.plugin.settings.createdDate = value as createdDateTypes;
					await this.plugin.saveSettings();
				});
			})
		
		containerEl.createEl('hr');
		containerEl.createEl('h2', {text: 'Optional imports'});
		
		new Setting(containerEl)
			.setClass('uo_setting')
			.setName('Import archived notes')
			.addToggle(toggle => {
				toggle.setValue(this.plugin.settings.importArchived)
				toggle.onChange(async (value) => {
					this.plugin.settings.importArchived = value;
					await this.plugin.saveSettings();
				});
			});
		
		new Setting(containerEl)
			.setClass('uo_setting')
			.setName('Import trashed notes')
			.addToggle(toggle => {
				toggle.setValue(this.plugin.settings.importTrashed)
				toggle.onChange(async (value) => {
					this.plugin.settings.importTrashed = value;
					await this.plugin.saveSettings();
				});
			});
		
		
		containerEl.createEl('hr');
		containerEl.createEl('h2', {text: 'Tags'});

		
		new Setting(containerEl)
			.setClass('uo_setting')
			.setName('Colour tags')
			.setDesc('Add a tag representing the color of the note in Google Keep.')
			.addToggle(toggle => {
				toggle.setValue(this.plugin.settings.addColorTags)
				toggle.onChange(async (value) => {
					this.plugin.settings.addColorTags = value;
					await this.plugin.saveSettings();
					colorPrefixInput.setDisabled(!value);
				});
			})
		let colorPrefixInput = new Setting(containerEl)
			.setClass('uo_setting')
			.setClass('uo_setting-child')
			.setDesc('Text to prepend to each colour tag.')
			.addText((text) => {
				text.setValue(this.plugin.settings.tagNames.colorPrepend);
				text.onChange(async (value) => {
					this.plugin.settings.tagNames.colorPrepend = value;
					await this.plugin.saveSettings();
				});
			})
			.setDisabled(!this.plugin.settings.addColorTags)


		new Setting(containerEl)
			.setClass('uo_setting')
			.setName('Pinned tags')
			.setDesc('Add a tag if the note was pinned in Google Keep.')
			.addToggle(toggle => {
				toggle.setValue(this.plugin.settings.addPinnedTags)
				toggle.onChange(async (value) => {
					this.plugin.settings.addPinnedTags = value;
					await this.plugin.saveSettings();
					pinnedTagInput.setDisabled(!value);
				});
			})
		let pinnedTagInput = new Setting(containerEl)
			.setClass('uo_setting')
			.setClass('uo_setting-child')
			.setDesc('Pinned tag.')
			.addText((text) => {
				text.setValue(this.plugin.settings.tagNames.isPinned);
				text.onChange(async (value) => {
					this.plugin.settings.tagNames.isPinned = value;
					await this.plugin.saveSettings();
				});
			})
			.setDisabled(!this.plugin.settings.addPinnedTags)


		new Setting(containerEl)
			.setClass('uo_setting')
			.setName('Attachment tags')
			.setDesc('Add a tag if the note has an attachment.')
			.addToggle(toggle => {
				toggle.setValue(this.plugin.settings.addAttachmentTags)
				toggle.onChange(async (value) => {
					this.plugin.settings.addAttachmentTags = value;
					await this.plugin.saveSettings();
					attachmentTagInput.setDisabled(!value);
				});
			})
		let attachmentTagInput = new Setting(containerEl)
			.setClass('uo_setting')
			.setClass('uo_setting-child')
			.setDesc('Attachment tag.')
			.addText((text) => {
				text.setValue(this.plugin.settings.tagNames.hasAttachment);
				text.onChange(async (value) => {
					this.plugin.settings.tagNames.hasAttachment = value;
					await this.plugin.saveSettings();
				});
			})
			.setDisabled(!this.plugin.settings.addAttachmentTags)


		new Setting(containerEl)
			.setClass('uo_setting')
			.setName('Archived tags')
			.setDesc('Add a tag if the note was archived in Google Keep (If imported).')
			.addToggle(toggle => {
				toggle.setValue(this.plugin.settings.addArchivedTags)
				toggle.onChange(async (value) => {
					this.plugin.settings.addArchivedTags = value;
					await this.plugin.saveSettings();
					archivedTagInput.setDisabled(!value);
				});
			})
		let archivedTagInput = new Setting(containerEl)
			.setClass('uo_setting')
			.setClass('uo_setting-child')
			.setDesc('Archived tag.')
			.addText((text) => {
				text.setValue(this.plugin.settings.tagNames.isArchived);
				text.onChange(async (value) => {
					this.plugin.settings.tagNames.isArchived = value;
					await this.plugin.saveSettings();
				});
			})
			.setDisabled(!this.plugin.settings.addArchivedTags)


		new Setting(containerEl)
			.setClass('uo_setting')
			.setName('Trashed tags')
			.setDesc('Add a tag if the note was trashed in Google Keep (If imported).')
			.addToggle(toggle => {
				toggle.setValue(this.plugin.settings.addTrashedTags)
				toggle.onChange(async (value) => {
					this.plugin.settings.addTrashedTags = value;
					await this.plugin.saveSettings();
					trashedTag.setDisabled(!value);
				});
			})
		let trashedTag = new Setting(containerEl)
			.setClass('uo_setting')
			.setClass('uo_setting-child')
			.setDesc('Trashed tag.')
			.addText((text) => {
				text.setValue(this.plugin.settings.tagNames.isTrashed);
				text.onChange(async (value) => {
					this.plugin.settings.tagNames.isTrashed = value;
					await this.plugin.saveSettings();
				});
			})
			.setDisabled(!this.plugin.settings.addTrashedTags)


		containerEl.createEl('hr');


		new Setting(containerEl)
			.addButton( (button) => {
				button.setButtonText('Reset settings');
				button.setWarning();
				button.onClick(async () => {
					this.plugin.settings = JSON.parse( JSON.stringify(DEFAULT_SETTINGS) );
					await this.plugin.saveSettings();
					this.display();
				})
			})
		


	}
}