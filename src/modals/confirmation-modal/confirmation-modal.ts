import { Modal, Setting } from "obsidian";
import MyPlugin from "src/main";


///////////////////
///////////////////


interface ConfirmationOptions {
	plugin: MyPlugin,
	title?: string,
	message?: string,
	cancelLabel?: string,
	cancelAction?: Function,
	confirmLabel?: string,
	confirmAction: Function,
}

export class ConfirmationModal extends Modal {
	title: string = 'Confirmation';
	message: string = 'Are you sure?';
	cancelLabel: string = 'Cancel';
	cancelAction: Function = () => {};
	confirmLabel: string = 'Yes';
	confirmAction: Function;

	constructor(options: ConfirmationOptions) {
		super(options.plugin.app);
		
		this.title = options.title || this.title;
		this.message = options.message || this.message;
		this.cancelLabel = options.cancelLabel || this.cancelLabel;
		this.confirmLabel = options.confirmLabel || this.confirmLabel;
		this.cancelAction = options.cancelAction || this.cancelAction;
		this.confirmAction = options.confirmAction;
	}

	/**
	 * Called automatically by the Modal class when modal is opened.
	 */
	onOpen() {
		const {titleEl, contentEl} = this;

		titleEl.setText(this.title);
		contentEl.createEl('p', {text: this.message});
		
		new Setting(contentEl).addButton(cancelBtn => {
			cancelBtn.setClass('gki_button');
			cancelBtn.setButtonText(this.cancelLabel);
			cancelBtn.onClick( () => {
				this.close();
				this.cancelAction()
			})
		})
		.addButton( confirmBtn => {
			confirmBtn.setClass('gki_button');
			confirmBtn.setWarning();
			confirmBtn.setButtonText(this.confirmLabel);
			confirmBtn.onClick( () => {
				this.close();
				this.confirmAction()
			})
		})

	}

	/**
	 * Called automatically by the Modal class when modal is closed.
	 */
	onClose() {
		this.titleEl.empty();
		this.contentEl.empty();
	}
}