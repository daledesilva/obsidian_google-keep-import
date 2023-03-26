import { Modal, Setting } from "obsidian";
import { SupportButtonSet } from "src/components/support-button-set/support-button-set";
import { FileImporter } from "src/logic/import-logic";
import MyPlugin from "src/main";


///////////////////
///////////////////


export class ImportProgressModal extends Modal {
	fileImporter: FileImporter;
	result: string;
	modalHeaderDiv: HTMLDivElement;
	bar: HTMLDivElement;
	remainingSpan: HTMLSpanElement;
	failedSpan: HTMLSpanElement;
	importedSpan: HTMLSpanElement;
	outputStr: string = '';
	outputLogEl: HTMLParagraphElement;
	importCompleted: Boolean = false;
	modalActions: Setting;

	resolveModal: (value: string) => void;
	rejectModal: (value: string) => void;

	constructor(plugin: MyPlugin, fileImporter: FileImporter) {
		super(plugin.app);
		this.fileImporter = fileImporter
	}

	/**
	 * Opens the modal and returns of a result.
	 */
	public showModal() {
		return new Promise((resolve, reject) => {
			this.open();
			this.resolveModal = resolve;
			this.rejectModal = reject;
		})
	}

	/**
	 * Called automatically by the Modal class when modal is opened.
	 */
	public onOpen() {
		const {titleEl, contentEl} = this;

		titleEl.setText('Import in progress');
		this.modalHeaderDiv = contentEl.createDiv();
		const progressBarEl = contentEl.createEl('div', {cls: 'gki_progress-bar'});
		this.bar = progressBarEl.createEl('div', {cls: 'gki_bar'});	

		
		const summaryEl = contentEl.createDiv('gki_import-summary');
		let bubbleEl;
		let pBubbleEl;

		bubbleEl = summaryEl.createDiv('gki_import-remaining');
		pBubbleEl = bubbleEl.createEl('p');
		this.remainingSpan = pBubbleEl.createEl('span', {cls: 'gki_import-number', text: `-`});
		pBubbleEl.createEl('br');
		pBubbleEl.createEl('span', {cls: 'gki_import-label', text: `remaining`});

		bubbleEl = summaryEl.createDiv('gki_import-failed');
		pBubbleEl = bubbleEl.createEl('p');
		this.failedSpan = pBubbleEl.createEl('span', {cls: 'gki_import-number', text: `-`});
		pBubbleEl.createEl('br');
		pBubbleEl.createEl('span', {cls: 'gki_import-label', text: `failed/skipped`});

		bubbleEl = summaryEl.createDiv('gki_import-imported');
		pBubbleEl = bubbleEl.createEl('p');
		this.importedSpan = pBubbleEl.createEl('span', {cls: 'gki_import-number', text: `-`});
		pBubbleEl.createEl('br');
		pBubbleEl.createEl('span', {cls: 'gki_import-label', text: `imported`});

		this.outputLogEl = contentEl.createDiv('gki_error-log');

		this.modalActions = new Setting(this.contentEl);
		new SupportButtonSet(this.modalActions);

		this.updateProgressVisuals()
	}

	/**
	 * Tells the modal to check the fileImporter that was passed in on instantiation and update the progress.
	 */
	private updateProgressVisuals() {

		const totalImports = this.fileImporter.getTotalImports();
		const {
			successCount,
			failCount,
			newLogEntries,
		} = this.fileImporter.getLatestProgress();

		// Update bar visual
		const perc = (successCount + failCount)/totalImports * 100;
		this.bar.setAttr('style', `width: ${perc}%`);

		// Update text
		this.remainingSpan.setText(`${totalImports-successCount-failCount}`);
		this.failedSpan.setText(`${failCount}`);
		this.importedSpan.setText(`${successCount}`);

		// Update output log
		for(let i=0; i<newLogEntries.length; i++) {
			this.addOutputLine(newLogEntries[i]);
		}

		// Finalise or continue on next frame
		if(successCount + failCount == totalImports) {
			this.importCompleted = true;
			this.applyCompletedState();
		} else {
			window.requestAnimationFrame(() => this.updateProgressVisuals());
		}
	}

	/**
	 * Adds a new line to the output log.
	 */
	private addOutputLine(options: {status: string, title: string, desc: string}) {
		const itemEl = this.outputLogEl.createDiv({cls: 'gki_item'});

		const itemHeaderEl = itemEl.createEl('p', {cls: 'gki_item-header'});
		const statusClass = options.status.toLowerCase();
		itemHeaderEl.createEl('span', {cls: `gki_status ${statusClass}`}).setText(options.status);
		itemHeaderEl.createEl('span', {cls: 'gki_title'}).setText(options.title);

		const itemBodyEl = itemEl.createEl('p', {cls: 'gki_item-body'});
		itemBodyEl.createEl('p', {cls: 'gki_desc'}).setText(options.desc);

		this.outputLogEl.addClass('gki_visible');
	}

	/**
	 * Restyles the modal to indicate the uploads have completed.
	 */
	public applyCompletedState() {
		this.titleEl.empty();
		this.modalHeaderDiv.createEl('h1', {text: 'Import Complete'});
		this.modalActions.addButton(btn => {
			btn.setCta();
			btn.setClass('gki_button');
			btn.setButtonText('Close');
			btn.onClick( (e) => {
				this.close();
			})
		})
	}

	/**
	 * Called automatically by the Modal class when the modal is closed.
	 */
	public onClose() {
		this.titleEl.empty();
		this.contentEl.empty();

		if(!this.importCompleted) {
			this.rejectModal('Import cancelled');
		}
	}
}




