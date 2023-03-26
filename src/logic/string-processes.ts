

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

	// Remove /
	let newArr = str.split('/');
	let newStr = newArr.join();

	// Remove \
	newArr = newStr.split('\\');
	newStr = newArr.join();

	// Remove :
	newArr = newStr.split(':');
	newStr = newArr.join();

	return newStr;
}