

///////////////////
///////////////////

import { MappingPresets, PluginSettings } from "src/types/plugin-settings";


/**
 * Takes a value and string and adds and pluralises the word if needed.
 * By default, it just adds an S on the end, but if a pluralVersion is passed it will use that.
 */
export const singleOrPlural = (count: number, singleVersion: string, pluralVersion?: string) => {
	if(count == 1 || count == -1) {
		return singleVersion;
	} else {
		if(pluralVersion) {
			// custom plural version passed in
			return pluralVersion;
		} else {
			// just add an s
			return `${singleVersion}s`;
		}
	}
}

/**
 * Removes characters from a string that cannot be used in filenames and returns a new string.
 */
export function filenameSanitize(str: string, settings: PluginSettings) {
	let nameStr = str;

	// remap problem characters
	for(let i=0; i<settings.problemChars.length; i++) {
		const problemChar = settings.problemChars[i].char;
		const replacement = settings.problemChars[i].replacement;
		nameStr = nameStr.split(problemChar).join(replacement);
	}

	// Remap invalid characters
	for(let i=0; i<settings.invalidChars.length; i++) {
		const invalidChar = settings.invalidChars[i].char;
		const replacement = settings.invalidChars[i].replacement;
		nameStr = nameStr.split(invalidChar).join(replacement).trim();
	}

	return nameStr;
}

/**
 * Removes characters from a folder that cannot be used.
 */
export function folderPathSanitize(str: string, settings: PluginSettings) {
	let pathArr;
	let pathStr = str;

	// path's have / to denot new folders, so remove them during santising and add back after.
	pathArr = pathStr.split('/');
	
	for(let j=0; j<pathArr.length; j++){
		
		// remap problem characters
		for(let i=0; i<settings.problemChars.length; i++) {
			const problemChar = settings.problemChars[i].char;
			const replacement = settings.problemChars[i].replacement;
			pathArr[j] = pathArr[j].split(problemChar).join(replacement).trim();
		}
		
		// Remap invalid characters
		for(let i=0; i<settings.invalidChars.length; i++) {
			const invalidChar = settings.invalidChars[i].char;
			const replacement = settings.invalidChars[i].replacement;
			pathArr[j] = pathArr[j].split(invalidChar).join(replacement).trim();
		}
		
	}
	
	pathStr = pathArr.join('/');

	// Remove trailing / incase changes above put a slash at the end
	while(pathStr.slice(-1) == '/') {
		pathStr = pathStr.slice(0,-1).trim();
	}

	return pathStr;
}

/**
 * Returns the file extension when passed a filename string.
 */
export function getFileExtension(filename: string): string {
	let ext = filename.split('.').pop();
	if(ext) {
		return ext.toLowerCase();
	} else {
		return '';
	}
}