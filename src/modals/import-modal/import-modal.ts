import { App, Modal, Notice, Setting } from "obsidian";
import { importFiles } from "src/logic/import-logic";
import { singleOrPlural } from "src/logic/string-processes";
import MyPlugin from "src/main";




export class StartImportModal extends Modal {
	plugin: MyPlugin;
	result: string;
	duplicateNotes: number = 0;
	noteSpan: HTMLSpanElement;
	assetSpan: HTMLSpanElement;
	fileBacklog: Array<File> = [];
	uploadInput: HTMLInputElement;
	modalActions: Setting;

	constructor(plugin: MyPlugin) {
		super(plugin.app);
		this.plugin = plugin;
	}

	onOpen() {
		const {titleEl, contentEl} = this;

		titleEl.setText('Import Google Keep backup');

		contentEl.createEl('p', {text: 'Here you can upload a set of jsons output from a Google Keep backup.'});
		contentEl.createEl('p', {text: 'Upload each json one at a time or all together. You should also upload any attachments in the backup as well such as png\'s jpgs, etc.'});
		contentEl.createEl('p', {text: 'If you import attachments or jsons separately and close this dialog, they will will automatically link together once their counterparts are imported later provided you haven\'t changed the names of attachments or modified the markdown embeds in the notes.'});


		const dropFrame = contentEl.createEl('div', {cls: 'uo_drop-frame'});

		const dropFrameText = dropFrame.createEl('p', { text: 'Drag your files here or ' });
		// const linkText = dropFrameText.createEl('a', {text: 'browse local files'})
		dropFrameText.createEl('label', { 
			text: 'browse local files',
			attr: {
				'class': 'uo_file-label',
				'for': 'uo_file',
			}
		})
		this.uploadInput = dropFrameText.createEl('input', { 
			type: 'file',
			attr: {
				'multiple': true,
				'id': 'uo_file',
				'accept': '.json, .jpg, .png, .3gp',
			}
		})


		const summaryP = contentEl.createEl('p', {cls: 'uo_before-import-summary'});
		summaryP.createEl('span', {text: `notes: `});
		this.noteSpan = summaryP.createEl('span', {cls: 'uo_import-number', text: `0`});
		summaryP.createEl('span', {text: ` | attachments: `});
		this.assetSpan = summaryP.createEl('span', {cls: 'uo_import-number', text: `0`});


		this.modalActions = new Setting(contentEl).addButton(btn => {
			btn.setClass('uo_button');
			btn.setCta();
			btn.setButtonText('Start Import');
			btn.setDisabled(true);
			btn.onClick( (e) => {
				this.close();
				importFiles(this.plugin, this.fileBacklog );
			})
		})

		this.uploadInput.addEventListener('change', () => {
			// Add imports to accumulative array
			this.addToFilesBacklog( Object.values(this.uploadInput.files as FileList) );
		});
		
		dropFrame.addEventListener('dragenter', (e) => {
			dropFrame.addClass('uo_drag-over-active');
		});
		
		dropFrame.addEventListener('dragover', (e) => {
			// Prevent default to allow drop
			e.preventDefault();
		});
		
		dropFrame.addEventListener('dragleave', (e) => {
			dropFrame.removeClass('uo_drag-over-active');
		});
		
		dropFrame.addEventListener('drop', (e) => {
			// Prevent default to stop browser opening file
			e.preventDefault();

			if(e.dataTransfer === null) return;

			dropFrame.removeClass('uo_drag-over-active');
			
			const files: Array<File> = [];

			if (e.dataTransfer.items) {
				// DataTransferItems is supporter in this browser
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


	addToFilesBacklog( files: Array<File> ) {
		let newFiles = 0;
		let duplicateFiles = 0;

		// Add non-duplicates to backlog
		files.forEach( (file) => {
			if( this.backlogContains(file) ) {
				duplicateFiles++;
			} else {
				this.fileBacklog.push(file);
				newFiles++;
			}
		})

		if(duplicateFiles>0) new Notice(`${duplicateFiles} ${singleOrPlural(duplicateFiles, 'file')} ignored because ${singleOrPlural(duplicateFiles, 'it\'s', 'they\'re')} already in the import list.`, 9000);
		new Notice(`${newFiles} new ${singleOrPlural(newFiles, 'file')} queued for import.`, 10000);

		// Erase references in upload component to prepare for new set
		this.uploadInput.files = null;
			
		// Update summary numbers
		const breakdown = this.getFilesBacklogBreakdown();
		this.noteSpan.setText(`${breakdown.notes}`);
		this.assetSpan.setText(`${breakdown.assets}`);

		// Activate start button
		const importBtn = this.modalActions.components[0];
		importBtn.setDisabled(false);
	}

	backlogContains(file: File) {
		for(let i=0; i<this.fileBacklog.length; i++) {
			// NOTE: Path isn't necessarily guaranteed in all environments.
			// Could do a name and content comparison for jsons, and a so too for binary if possible.
			// Maybe even just a content comparison. For not this is fine.
			if((file as any).path) {
				if((file as any).path == (this.fileBacklog[i] as any).path) return true;
			}
		}
		// If no duplicates found
		return false;
	}

	getFilesBacklogBreakdown(): { notes : number, assets: number } {
		let notes = 0;
		let assets = 0;

		for(let i=0; i<this.fileBacklog.length; i++) {
			const file = this.fileBacklog[i] as File;
	
			switch(file.type) {
				case 'application/json':	notes++;				break;
				default:					assets++;				break;
			}
		}

		return {
			notes,
			assets
		}
	}


	onClose() {
		const {titleEl, contentEl} = this;
		titleEl.empty();
		contentEl.empty();
	}
}