import { Modal, Setting } from "obsidian";
import { addResetButton, BasicSettingsGroup, CharMappingGroup, InclusionSettingsGroup, TagSettingsGroup } from "src/components/settings-groups/settings-groups";
import { SupportButtonSet } from "src/components/support-button-set/support-button-set";
import GoogleKeepImportPlugin from "src/main";


///////////////////
///////////////////


export class EditSettingsModal extends Modal {
	plugin: GoogleKeepImportPlugin;
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

	constructor(plugin: GoogleKeepImportPlugin) {
		super(plugin.app);
		this.plugin = plugin;
	}
	
	/**
	 * Opens the modal and returns of a result.
	 */
	public showModal(): Promise<Array<File>> {
		return new Promise((resolve, reject) => {
			this.open();
			this.resolveModal = resolve;
			this.rejectModal = reject;
		})
	}

	/**
	 * Called automatically by the Modal class when modal is opened.
	 */
	onOpen() {
		const {titleEl, contentEl} = this;
		contentEl.empty();

		contentEl.createEl('h1', {text: 'Google Keep Import Settings'});
		contentEl.createEl('p', {text: 'All settings will save immediately. Close this modal to return to your import.'});
		
		contentEl.createEl('hr');
		new BasicSettingsGroup(contentEl, this.plugin);
		
		contentEl.createEl('hr');
		new InclusionSettingsGroup(contentEl, this.plugin);
		
		contentEl.createEl('hr');
		new TagSettingsGroup(contentEl, this.plugin);
		
		contentEl.createEl('hr');
		new CharMappingGroup(contentEl, this.plugin, () => this.onOpen());

		contentEl.createEl('hr');
		const modalActions = new Setting(contentEl);
		new SupportButtonSet(modalActions);
		addResetButton(modalActions, this.plugin, () => this.onOpen());	// TODO: Can this be refactored as new ResetButton(modalActions, this.plugin, () => this.onOpen())
		modalActions.addButton( (button) => {
			button.setButtonText('Close');
			button.setClass('gki_button');
			button.setCta();
			button.onClick(() => {
				this.close();
			})
		})
	}

	/**
	 * Called automatically by the Modal class when the modal is closed.
	 */
	onClose() {
		this.contentEl.empty();
	}
}