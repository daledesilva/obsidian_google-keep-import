import { App, Modal, Setting, TFile, TFolder } from "obsidian";
import MyPlugin from "src/main";






export class ImportProgressModal extends Modal {
	result: string;
	bar: HTMLDivElement;
	remainingSpan: HTMLSpanElement;
	failedSpan: HTMLSpanElement;
	importedSpan: HTMLSpanElement;
	outputStr: string = '';
	outputLogEl: HTMLParagraphElement;

	constructor(plugin: MyPlugin) {
		super(plugin.app);
	}

	onOpen() {
		const {titleEl, contentEl} = this;

		titleEl.setText('Import in progress');

		const progressBarEl = contentEl.createEl('div', {cls: 'uo_progress-bar'});
		this.bar = progressBarEl.createEl('div', {cls: 'uo_bar'});	

		
		const summaryEl = contentEl.createDiv('uo_during-import-summary');
		let bubbleEl;
		let pBubbleEl

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

	}

	public updateProgressVisuals(options: {successCount: number, failCount: number, totalImports: number}) {
		const {
			successCount,
			failCount,
			totalImports
		} = options;

		// Update bar visual
		const perc = (successCount + failCount)/totalImports * 100;
		this.bar.setAttr('style', `width: ${perc}%`);

		// Update text
		this.remainingSpan.setText(`${totalImports-successCount-failCount}`);
		this.failedSpan.setText(`${failCount}`);
		this.importedSpan.setText(`${successCount}`);

	}

	public addOutputLine(options: {status: string, title: string, desc: string}) {
		const itemEl = this.outputLogEl.createDiv({cls: 'uo_item'});

		const itemHeaderEl = itemEl.createEl('p', {cls: 'uo_item-header'});
		itemHeaderEl.createEl('span', {cls: 'uo_status'}).setText(options.status);
		itemHeaderEl.createEl('span', {cls: 'uo_title'}).setText(options.title);

		const itemBodyEl = itemEl.createEl('p', {cls: 'uo_item-body'});
		itemBodyEl.createEl('p', {cls: 'uo_desc'}).setText(options.desc);

		this.outputLogEl.addClass('uo_visible');
	}

	public applyCompletedState() {
		const modalActions = new Setting(this.contentEl).addButton(btn => {
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
	}
}



export function updateProgress(options: {successCount: number, failCount: number, totalImports: number, modal: ImportProgressModal}) {
	const {successCount, failCount, totalImports, modal} = options;

	modal.updateProgressVisuals({
		successCount,
		failCount,
		totalImports
	})

	if(successCount + failCount == totalImports) {
		modal.applyCompletedState();
	}
}


export function addOutputLine(options: {status: string, title: string, desc: string, modal: ImportProgressModal}) {
	options.modal.addOutputLine({
		status: options.status,
		title: options.title,
		desc: options.desc
	});
}




