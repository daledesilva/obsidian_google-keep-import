import { Setting } from "obsidian";
import { folderNameSanitize } from "src/logic/string-processes";
import GoogleKeepImportPlugin from "src/main";
import { ConfirmationModal } from "src/modals/confirmation-modal/confirmation-modal";
import { CreatedDateTypes } from "src/types/plugin-settings";


///////////////////
///////////////////


/**
 * Inserts several fields to allow the user to edit basic settings of each import.
 */
export class BasicSettingsGroup {

    constructor(containerEl: HTMLElement, plugin: GoogleKeepImportPlugin) {

        containerEl.createEl('h2', {text: 'Basics'});

        new Setting(containerEl)
            .setClass('gki_setting')
            .setName('Note import folder')
            .addText((text) => {
                text.setValue(plugin.settings.folderNames.notes);
                text.inputEl.addEventListener('blur', async (e) => {
                    const value = folderNameSanitize(text.getValue());
                    plugin.settings.folderNames.notes = folderNameSanitize(value);
                    text.setValue(value);
                    await plugin.saveSettings();
                });
            });
        
        new Setting(containerEl)
            .setClass('gki_setting')
            .setName('Attachment import folder')
            .addText((text) => {
                text.setValue(plugin.settings.folderNames.assets);
                text.inputEl.addEventListener('blur', async (e) => {
                    const value = folderNameSanitize(text.getValue());
                    plugin.settings.folderNames.assets = folderNameSanitize(value);
                    text.setValue(value);
                    await plugin.saveSettings();
                });
            });

        new Setting(containerEl)
            .setClass('gki_setting')
            .setName('Unsupported attachment import folder')
            .addText((text) => {
                text.setValue(plugin.settings.folderNames.unsupportedAssets);
                text.inputEl.addEventListener('blur', async (e) => {
                    const value = folderNameSanitize(text.getValue());
                    plugin.settings.folderNames.unsupportedAssets = folderNameSanitize(value);
                    text.setValue(value);
                    await plugin.saveSettings();
                });
            });
        
        new Setting(containerEl)
            .setClass('gki_setting')
            .setName('Note creation date')
            .setDesc('Should the imported note have a creation date set to the Google Keep note\'s creation date, or the date imported into Obsidian?')
            .addDropdown((dropdown) => {
                dropdown.addOption(CreatedDateTypes.googleKeep, CreatedDateTypes.googleKeep);
                dropdown.addOption(CreatedDateTypes.import, CreatedDateTypes.import);
                dropdown.setValue(plugin.settings.createdDate)
                dropdown.onChange(async (value) => {
                    plugin.settings.createdDate = value as CreatedDateTypes;
                    await plugin.saveSettings();
                });
            })
    }

}


/**
 * Inserts several toggles to allow the user to edit what should be included in an import.
 */
export class InclusionSettingsGroup {

    constructor(containerEl: HTMLElement, plugin: GoogleKeepImportPlugin) {
        
        containerEl.createEl('h2', {text: 'Inclusions'});
        
        new Setting(containerEl)
            .setClass('gki_setting')
            .setName('Import archived notes')
            .addToggle(toggle => {
                toggle.setValue(plugin.settings.importArchived)
                toggle.onChange(async (value) => {
                    plugin.settings.importArchived = value;
                    await plugin.saveSettings();
                });
            });
        
        new Setting(containerEl)
            .setClass('gki_setting')
            .setName('Import trashed notes')
            .addToggle(toggle => {
                toggle.setValue(plugin.settings.importTrashed)
                toggle.onChange(async (value) => {
                    plugin.settings.importTrashed = value;
                    await plugin.saveSettings();
                });
            });
        
        new Setting(containerEl)
            .setClass('gki_setting')
            .setName('Import unsupported files')
            .setDesc('Importing unsupported files will place them in correct folders and notify you on import. But they won\'t show up in Obsidian until you convert them manually through another program.')
            .addToggle(toggle => {
                toggle.setValue(plugin.settings.importUnsupported)
                toggle.onChange(async (value) => {
                    plugin.settings.importUnsupported = value;
                    await plugin.saveSettings();
                    importHtmlToggle.setDisabled(!value);
                });
            });
        let importHtmlToggle = new Setting(containerEl)
            .setClass('gki_setting')
            .setName('Import html files')
            .setDesc('While HTML files are unsupported, they\'re also duplicates of supported notes in a Google Keep export. So you probably don\'t want these regardless.')
            .addToggle(toggle => {
                toggle.setValue(plugin.settings.importHtml)
                toggle.onChange(async (value) => {
                    plugin.settings.importHtml = value;
                    await plugin.saveSettings();
                });
            })
            .setDisabled(!plugin.settings.importUnsupported)
        
    }

}


/**
 * Inserts several fields to allow the user to edit how tags are treated during imports.
 */
export class TagSettingsGroup {
    
    constructor(containerEl: HTMLElement, plugin: GoogleKeepImportPlugin) {
        
        containerEl.createEl('h2', {text: 'Tags'});

        new Setting(containerEl)
            .setClass('gki_setting')
            .setName('Add label tags')
            .setDesc('Add a tag to represent each label present in the Google Keep note.')
            .addToggle(toggle => {
                toggle.setValue(plugin.settings.addLabelTags)
                toggle.onChange(async (value) => {
                    plugin.settings.addLabelTags = value;
                    await plugin.saveSettings();
                    labelPrefixInput.setDisabled(!value);
                });
            })
        let labelPrefixInput = new Setting(containerEl)
            .setClass('gki_setting')
            .setClass('gki_setting-child')
            .setDesc('Text to prepend to each label tag:')
            .addText((text) => {
                text.setValue(plugin.settings.tagNames.labelPrepend);
                text.inputEl.addEventListener('blur', async (e) => {
                    const value = text.getValue();
                    plugin.settings.tagNames.labelPrepend = value;
                    text.setValue(value);
                    await plugin.saveSettings();
                });
            })
            .setDisabled(!plugin.settings.addColorTags)

        
        new Setting(containerEl)
            .setClass('gki_setting')
            .setName('Add colour tags')
            .setDesc('Add a tag representing the color of the note in Google Keep.')
            .addToggle(toggle => {
                toggle.setValue(plugin.settings.addColorTags)
                toggle.onChange(async (value) => {
                    plugin.settings.addColorTags = value;
                    await plugin.saveSettings();
                    colorPrefixInput.setDisabled(!value);
                });
            })
        let colorPrefixInput = new Setting(containerEl)
            .setClass('gki_setting')
            .setClass('gki_setting-child')
            .setDesc('Text to prepend to each colour tag:')
            .addText((text) => {
                text.setValue(plugin.settings.tagNames.colorPrepend);
                text.inputEl.addEventListener('blur', async (e) => {
                    const value = text.getValue();
                    plugin.settings.tagNames.colorPrepend = value;
                    text.setValue(value);
                    await plugin.saveSettings();
                });
            })
            .setDisabled(!plugin.settings.addColorTags)


        new Setting(containerEl)
            .setClass('gki_setting')
            .setName('Add pinned tags')
            .setDesc('Add a tag if the note was pinned in Google Keep.')
            .addToggle(toggle => {
                toggle.setValue(plugin.settings.addPinnedTags)
                toggle.onChange(async (value) => {
                    plugin.settings.addPinnedTags = value;
                    await plugin.saveSettings();
                    pinnedTagTextField.setDisabled(!value);
                });
            })
        let pinnedTagTextField = new Setting(containerEl)
            .setClass('gki_setting')
            .setClass('gki_setting-child')
            .setDesc('Pinned tag:')
            .addText((text) => {
                text.setValue(plugin.settings.tagNames.isPinned);
                text.inputEl.addEventListener('blur', async (e) => {
                    const value = text.getValue();
                    plugin.settings.tagNames.isPinned = value;
                    text.setValue(value);
                    await plugin.saveSettings();
                });
            })
            .setDisabled(!plugin.settings.addPinnedTags)


        new Setting(containerEl)
            .setClass('gki_setting')
            .setName('Add attachment tags')
            .setDesc('Add a tag if the note has an attachment.')
            .addToggle(toggle => {
                toggle.setValue(plugin.settings.addAttachmentTags)
                toggle.onChange(async (value) => {
                    plugin.settings.addAttachmentTags = value;
                    await plugin.saveSettings();
                    attachmentTagTextField.setDisabled(!value);
                });
            })
        let attachmentTagTextField = new Setting(containerEl)
            .setClass('gki_setting')
            .setClass('gki_setting-child')
            .setDesc('Attachment tag:')
            .addText((text) => {
                text.setValue(plugin.settings.tagNames.hasAttachment);
                text.inputEl.addEventListener('blur', async (e) => {
                    const value = text.getValue();
                    plugin.settings.tagNames.hasAttachment = value;
                    text.setValue(value);
                    await plugin.saveSettings();
                });
            })
            .setDisabled(!plugin.settings.addAttachmentTags)


        new Setting(containerEl)
            .setClass('gki_setting')
            .setName('Add archived tags')
            .setDesc('Add a tag if the note was archived in Google Keep (If imported).')
            .addToggle(toggle => {
                toggle.setValue(plugin.settings.addArchivedTags)
                toggle.onChange(async (value) => {
                    plugin.settings.addArchivedTags = value;
                    await plugin.saveSettings();
                    archivedTagTextField.setDisabled(!value);
                });
            })
        let archivedTagTextField = new Setting(containerEl)
            .setClass('gki_setting')
            .setClass('gki_setting-child')
            .setDesc('Archived tag:')
            .addText((text) => {
                text.setValue(plugin.settings.tagNames.isArchived);
                text.inputEl.addEventListener('blur', async (e) => {
                    const value = text.getValue();
                    plugin.settings.tagNames.isArchived = value;
                    text.setValue(value);
                    await plugin.saveSettings();
                });
            })
            .setDisabled(!plugin.settings.addArchivedTags)


        new Setting(containerEl)
            .setClass('gki_setting')
            .setName('Add trashed tags')
            .setDesc('Add a tag if the note was trashed in Google Keep (If imported).')
            .addToggle(toggle => {
                toggle.setValue(plugin.settings.addTrashedTags)
                toggle.onChange(async (value) => {
                    plugin.settings.addTrashedTags = value;
                    await plugin.saveSettings();
                    trashedTag.setDisabled(!value);
                });
            })
        let trashedTag = new Setting(containerEl)
            .setClass('gki_setting')
            .setClass('gki_setting-child')
            .setDesc('Trashed tag:')
            .addText((text) => {
                text.setValue(plugin.settings.tagNames.isTrashed);
                text.inputEl.addEventListener('blur', async (e) => {
                    const value = text.getValue();
                    plugin.settings.tagNames.isTrashed = value;
                    text.setValue(value);
                    await plugin.saveSettings();
                });
            })
            .setDisabled(!plugin.settings.addTrashedTags)

    }
}

/**
 * Adds a button that resets the plugin's setting to default.
 */
export function addResetButton(settingEl: Setting, plugin: GoogleKeepImportPlugin, onComplete: Function): Setting {
    return settingEl.addButton( (button) => {
        button.setButtonText('Reset settings');
        button.setClass('gki_button');
        button.onClick(() => {
            new ConfirmationModal({
                plugin: plugin,
                title: 'Please confirm',
                message: 'Reset to default settings for Google Keep Import?',
                confirmLabel: 'Reset settings',
                confirmAction: async () => {
                    await plugin.resetSettings();
                    onComplete();
                }
            }).open();
        })
    })
}