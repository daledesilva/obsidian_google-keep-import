

///////////////////
///////////////////


export class ImportSummary {
    summaryEl: HTMLElement;

    constructor(parentEl: HTMLElement) {
        this.summaryEl = parentEl.createDiv('gki_import-summary');
    }

    hide() {
        this.summaryEl.addClass('gki_hidden');
    }

    show() {
        this.summaryEl.removeClass('gki_hidden');
    }

    addItem(label: string): HTMLSpanElement {
        let bubbleEl: HTMLDivElement;
		let pBubbleEl: HTMLParagraphElement;
        let valueSpan: HTMLSpanElement;

        bubbleEl = this.summaryEl.createDiv('gki_import-imported');
		pBubbleEl = bubbleEl.createEl('p');
		valueSpan = pBubbleEl.createEl('span', {cls: 'gki_import-number', text: `0`});
		pBubbleEl.createEl('br');
		pBubbleEl.createEl('span', {cls: 'gki_import-label', text: label});

        return valueSpan;
    }
}