

///////////////////
///////////////////


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
export function filenameSanitize(str: string) {
	let newArr;
	let newStr = str;

	// Remove characters obsidian doesn't support in filenames
	newArr = str.split('/');
	newStr = newArr.join('-');
	//
	newArr = newStr.split('\\');	// Single slash escaped
	newStr = newArr.join('-');
	//
	newArr = newStr.split(':');
	newStr = newArr.join('-');
	

	// Remove characters obsidian supports in filenames but will break linkability
	newArr = newStr.split('#');
	newStr = newArr.join('');
	//
	newArr = newStr.split('^');
	newStr = newArr.join('');
	//
	newArr = newStr.split('[');
	newStr = newArr.join('(');
	//
	newArr = newStr.split(']');
	newStr = newArr.join(')');
	//
	newArr = newStr.split('|');
	newStr = newArr.join('');
	

	return newStr;
}

/**
 * Removes characters from a folder that cannot be used.
 */
export function folderPathSanitize(str: string) {
	let newArr;
	let newStr = str;

	// Remove characters obsidian supports in filenames but will break linkability
	newArr = newStr.split('#');
	newStr = newArr.join('');
	//
	newArr = newStr.split('^');
	newStr = newArr.join('');
	//
	newArr = newStr.split('[');
	newStr = newArr.join('(');
	//
	newArr = newStr.split(']');
	newStr = newArr.join(')');
	//
	newArr = newStr.split('|');
	newStr = newArr.join('');

	// Remove characters obsidian doesn't support in a file path
	newArr = newStr.split('\\');	// Single slash escaped
	newStr = newArr.join('-');
	//
	newArr = newStr.split(':');
	newStr = newArr.join('-');

	// Slashes can't be used in folder names but are used in folder paths to delineate folders
	// Remove trailing /
	// NOTE: This has to be last incase changes above put a slash at the end
	while(newStr.slice(-1) == '/') {
		newStr = newStr.slice(0,-1);
	}

	return newStr;
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