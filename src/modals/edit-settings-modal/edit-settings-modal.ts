import { Modal, Setting } from "obsidian";
import { AddBasicSettings, AddInclusionSettings, addResetButton, AddTagSettings } from "src/components/settings-groups/settings-groups";
import { SupportButtonSet } from "src/components/support-button-set/support-button-set";
import MyPlugin from "src/main";


///////////////////
///////////////////

export class EditSettingsModal extends Modal {
	plugin: MyPlugin;
	result: string;
	duplicateNotes: number = 0;
	noteSpan: HTMLSpanElement;
	assetSpan: HTMLSpanElement;
	fileBacklog: Array<File> = [];
	uploadInput: HTMLInputElement;
	modalActions: Setting;
	startBtn: Setting;
	resolveModal: (value: Array<File>) => void;
	rejectModal: (value: string) => void;

	constructor(plugin: MyPlugin) {
		super(plugin.app);
		this.plugin = plugin;
	}

	showModal(): Promise<Array<File>> {
		return new Promise((resolve, reject) => {
			this.open();
			this.resolveModal = resolve;
			this.rejectModal = reject;
		})
	}

	onOpen() {
		const {titleEl, contentEl} = this;
		contentEl.empty();

		contentEl.createEl('h1', {text: 'Google Keep Import Settings'});
		contentEl.createEl('p', {text: 'All settings will save immediately. Close this modal to return to your import.'});
		
		contentEl.createEl('hr');
		contentEl.createEl('h2', {text: 'Basics'});
		AddBasicSettings(contentEl, this.plugin);
		
		contentEl.createEl('hr');
		contentEl.createEl('h2', {text: 'Inclusions'});
		AddInclusionSettings(contentEl, this.plugin);
		
		contentEl.createEl('hr');
		contentEl.createEl('h2', {text: 'Tags'});
		AddTagSettings(contentEl, this.plugin);

		contentEl.createEl('hr');
		const modalActions = new Setting(contentEl);
		new SupportButtonSet(modalActions);
		addResetButton(modalActions, this.plugin, () => this.onOpen());
		modalActions.addButton( (button) => {
			button.setButtonText('Close');
			button.setClass('gki_button');
			button.setCta();
			button.onClick(() => {
				this.close();
			})
		})
	}


	onClose() {
		this.contentEl.empty();
	}
}