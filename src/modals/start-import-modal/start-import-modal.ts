import { Modal, Notice, Setting } from "obsidian";
import { singleOrPlural } from "src/logic/string-processes";
import GoogleKeepImportPlugin from "src/main";
import { EditSettingsModal } from "../edit-settings-modal/edit-settings-modal";
import { SupportButtonSet } from 'src/components/support-button-set/support-button-set';
import { ImportSummary } from "src/components/import-summary/import-summary";
import { fileIsJson } from "src/logic/import-logic";


///////////////////
///////////////////


export class StartImportModal extends Modal {
	plugin: GoogleKeepImportPlugin;
	result: string;
	duplicateNotes: number = 0;
	notesSpan: HTMLSpanElement;
	attachmentsSpan: HTMLSpanElement;
	importSummary: ImportSummary;
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
	public onOpen() {
		const {contentEl} = this;

		contentEl.createEl('h1', {text: 'Import Google Keep Files'});

		const firstParaEl = contentEl.createEl('p', {
			text: 'To export your files from Google Keep, open ',
			cls: 'gki_info-bubble'
		});
		firstParaEl.createEl('a', {
			text: 'Google Takeout',
			href: 'https://takeout.google.com/'
		});
		firstParaEl.appendText(' and select only Google Keep files. Once you have the exported zip, unzip it and drag all the files in below.');

		const dropFrame = contentEl.createEl('div', {cls: 'gki_drop-frame'});
		dropFrame.createEl('div', {cls: 'gki_highlight'});
		const dropFrameText = dropFrame.createEl('p', { text: 'Drag all files here or ' });
		dropFrameText.createEl('label', { 
			text: 'browse local files',
			attr: {
				'class': 'gki_file-input_label',
				'for': 'gki_file-input',
			}
		})
		this.uploadInput = dropFrameText.createEl('input', { 
			type: 'file',
			attr: {
				'multiple': true,
				'id': 'gki_file-input',
			}
		})

		this.importSummary = new ImportSummary(dropFrame);
		this.importSummary.hide();
		this.notesSpan = this.importSummary.addItem('notes');
		this.attachmentsSpan = this.importSummary.addItem('other');

		this.modalActions = new Setting(contentEl);
		new SupportButtonSet(this.modalActions);
		this.modalActions.addButton(btn => {
			btn.setClass('gki_button');
			btn.setButtonText('Edit settings');
			btn.onClick( async (e) => {
				const modal = new EditSettingsModal(this.plugin)
				modal.showModal();
			})
		})
		this.startBtn = this.modalActions.addButton(btn => {
			btn.setClass('gki_button');
			btn.setCta();
			btn.setButtonText('Start Import');
			btn.setDisabled(true);
			btn.onClick( (e) => {
				this.resolveModal(this.fileBacklog)
				this.close();
			})
		})
		
		// Actions
		//////////

		// Enable adding files by clicking
		this.uploadInput.addEventListener('change', () => {
			this.addToFilesBacklog( Object.values(this.uploadInput.files as FileList) );
		});

		// Add visual drag and drop feedback
		dropFrame.addEventListener('dragenter', (e) => {
			dropFrame.addClass('gki_drag-over-active');
		});		
		dropFrame.addEventListener('dragleave', (e) => {
			dropFrame.removeClass('gki_drag-over-active');
		});

		// Enable adding files by dragging and dropping
		dropFrame.addEventListener('dragover', (e) => {
			e.preventDefault(); // Prevent default to allow drop
		});
		dropFrame.addEventListener('drop', (e) => {
			e.preventDefault(); // Prevent default to stop browser opening file
			dropFrame.removeClass('gki_drag-over-active');

			// Bail if there are no files
			if(e.dataTransfer === null) return;

			// Add all files to the import backlog
			const files: Array<File> = [];
			// TODO: Find out the difference between these two things and if I can just use dataTransfer.files
			if (e.dataTransfer.items) {
				// DataTransferItems is supported in this browser

				const items = [...e.dataTransfer.items];
				for(let i=0; i<items.length; i++) {
					const item = items[i];
					if (item.kind === 'file') {
						const file: File | null = item.getAsFile();
						if(file) files.push(file);
					}
				};

			} else {
				// Use DataTransfer interface to access the file(s)
				files.push(...e.dataTransfer.files);

			}
			this.addToFilesBacklog(files);
		});


	}

	/**
	 * Adds files to the backlog which can then be passed to a fileImporter object
	 */
	private addToFilesBacklog( files: Array<File> ) {
		let newFiles = 0;
		let duplicateFiles = 0;

		// Add all files not already in the backlog
		files.forEach( (file) => {
			if( this.backlogContains(file) ) {
				duplicateFiles++;
			} else {
				this.fileBacklog.push(file);
				newFiles++;
			}
		})

		// Let the user know how many files were added and how many were skipped due to duplicates
		if(duplicateFiles>0) {
			new Notice(`${duplicateFiles} ${singleOrPlural(duplicateFiles, 'file')} ignored because ${singleOrPlural(duplicateFiles, 'it\'s', 'they\'re')} already in the import list.`, 9000);
		}
		new Notice(`${newFiles} new ${singleOrPlural(newFiles, 'file')} queued for import.`, 10000);

		// Erase references in upload component to prepare for new set
		this.uploadInput.files = null;
			
		// Update summary numbers
		const breakdown = this.getBacklogBreakdown();
		this.notesSpan.setText(`${breakdown.notes}`);
		this.attachmentsSpan.setText(`${breakdown.assets}`);
		this.importSummary.show();

		// Activate start button
		this.startBtn.setDisabled(false);
	}

	/**
	 * Checks if the backlog already contains a file
	 */
	private backlogContains(file: File): boolean {
		for(let i=0; i<this.fileBacklog.length; i++) {
			// TODO: Look up which environments this might not be supported in and deal with if necessary
			// NOTE: Path isn't necessarily guaranteed in all environments.
			// Could do a name and content comparison for jsons, and also too for binary if possible.
			// Maybe even just a content comparison. For now this is fine.
			if((file as any).path) {
				if((file as any).path == (this.fileBacklog[i] as any).path) return true;
			}
		}
		// If no file found in backlog
		return false;
	}

	/**
	 * Gets the number of notes and assets that have been added to the backlog for import
	 */
	private getBacklogBreakdown(): { notes : number, assets: number } {
		let notes = 0;
		let assets = 0;

		for(let i=0; i<this.fileBacklog.length; i++) {
			const file = this.fileBacklog[i] as File;
	
			if(fileIsJson(file)) {
				notes++;
			} else {
				assets++;
			}
		}

		return {
			notes,
			assets
		}
	}

	/**
	 * Called automatically when modal is closed by user
	 */
	public onClose() {
		this.titleEl.empty();
		this.contentEl.empty();
	}
}