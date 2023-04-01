

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

	// Remove /
	newArr = str.split('/');
	newStr = newArr.join('');

	// Remove \
	newArr = newStr.split('\\');
	newStr = newArr.join('');

	// Remove :
	newArr = newStr.split(':');
	newStr = newArr.join('');

	return newStr;
}

/**
 * Removes characters from a folder that cannot be used.
 */
export function folderNameSanitize(str: string) {
	let newArr;
	let newStr = str;

	// Remove \
	newArr = newStr.split('\\');
	newStr = newArr.join('');

	// Remove :
	newArr = newStr.split(':');
	newStr = newArr.join('');

	// Remove trailing /
	// NOTE: This has to be last incase changes above put a slash at the end
	while(newStr.slice(-1) == '/') {
		newStr = newStr.slice(0,-1);
	}

	return newStr;
}