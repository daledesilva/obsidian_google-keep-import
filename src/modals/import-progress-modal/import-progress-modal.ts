import { App, Modal, Setting, TFile, TFolder } from "obsidian";
import { SupportButtonSet } from "src/components/support-button-set/support-button-set";
import { FileImporter } from "src/logic/import-logic";
import MyPlugin from "src/main";






export class ImportProgressModal extends Modal {
	fileImporter: FileImporter;
	result: string;
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

	showModal() {
		return new Promise((resolve, reject) => {
			this.open();
			this.resolveModal = resolve;
			this.rejectModal = reject;
		})
	}

	onOpen() {
		const {titleEl, contentEl} = this;

		titleEl.setText('Import in progress');

		const progressBarEl = contentEl.createEl('div', {cls: 'uo_progress-bar'});
		this.bar = progressBarEl.createEl('div', {cls: 'uo_bar'});	

		
		const summaryEl = contentEl.createDiv('uo_during-import-summary');
		let bubbleEl;
		let pBubbleEl;

		bubbleEl = summaryEl.createDiv('uo_import-remaining');
		pBubbleEl = bubbleEl.createEl('p');
		this.remainingSpan = pBubbleEl.createEl('span', {cls: 'uo_import-number', text: `-`});
		pBubbleEl.createEl('br');
		pBubbleEl.createEl('span', {cls: 'uo_import-label', text: `remaining`});

		bubbleEl = summaryEl.createDiv('uo_import-failed');
		pBubbleEl = bubbleEl.createEl('p');
		this.failedSpan = pBubbleEl.createEl('span', {cls: 'uo_import-number', text: `-`});
		pBubbleEl.createEl('br');
		pBubbleEl.createEl('span', {cls: 'uo_import-label', text: `failed/skipped`});

		bubbleEl = summaryEl.createDiv('uo_import-imported');
		pBubbleEl = bubbleEl.createEl('p');
		this.importedSpan = pBubbleEl.createEl('span', {cls: 'uo_import-number', text: `-`});
		pBubbleEl.createEl('br');
		pBubbleEl.createEl('span', {cls: 'uo_import-label', text: `imported`});

		this.outputLogEl = contentEl.createDiv('uo_import-log');

		this.modalActions = new Setting(this.contentEl);
		new SupportButtonSet(this.modalActions);

		this.updateProgressVisuals()
	}

	public updateProgressVisuals() {

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

	public addOutputLine(options: {status: string, title: string, desc: string}) {
		const itemEl = this.outputLogEl.createDiv({cls: 'uo_item'});

		const itemHeaderEl = itemEl.createEl('p', {cls: 'uo_item-header'});
		const statusClass = options.status.toLowerCase();
		itemHeaderEl.createEl('span', {cls: `uo_status ${statusClass}`}).setText(options.status);
		itemHeaderEl.createEl('span', {cls: 'uo_title'}).setText(options.title);

		const itemBodyEl = itemEl.createEl('p', {cls: 'uo_item-body'});
		itemBodyEl.createEl('p', {cls: 'uo_desc'}).setText(options.desc);

		this.outputLogEl.addClass('uo_visible');
	}

	public applyCompletedState() {
		this.modalActions.addButton(btn => {
			btn.setCta();
			btn.setClass('uo_button');
			btn.setButtonText('Close');
			btn.onClick( (e) => {
				this.close();
			})
		})
	}

	onClose() {
		const {titleEl, contentEl} = this;
		titleEl.empty();
		contentEl.empty();

		if(!this.importCompleted) {
			this.rejectModal('Import cancelled');
		}
	}
}




