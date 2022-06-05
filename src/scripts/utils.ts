export function parseCSVToArray(strData: string, strDelimiter: string) {
	// Check to see if the delimiter is defined. If not,
	// then default to comma.
	strDelimiter = strDelimiter || ',';

	// Create a regular expression to parse the CSV values.
	var objPattern = new RegExp(
		// Delimiters.
		'(\\' +
			strDelimiter +
			'|\\r?\\n|\\r|^)' +
			// Quoted fields.
			'(?:"([^"]*(?:""[^"]*)*)"|' +
			// Standard fields.
			'([^"\\' +
			strDelimiter +
			'\\r\\n]*))',
		'gi'
	);

	// Create an array to hold our data. Give the array
	// a default empty first row.
	var arrData: any = [[]];

	// Create an array to hold our individual pattern
	// matching groups.
	var arrMatches = null;

	// Keep looping over the regular expression matches
	// until we can no longer find a match.
	while ((arrMatches = objPattern.exec(strData))) {
		// Get the delimiter that was found.
		var strMatchedDelimiter = arrMatches[1];

		// Check to see if the given delimiter has a length
		// (is not the start of string) and if it matches
		// field delimiter. If id does not, then we know
		// that this delimiter is a row delimiter.
		if (strMatchedDelimiter.length && strMatchedDelimiter !== strDelimiter) {
			// Since we have reached a new row of data,
			// add an empty row to our data array.
			arrData.push([]);
		}

		var strMatchedValue;

		// Now that we have our delimiter out of the way,
		// let's check to see which kind of value we
		// captured (quoted or unquoted).
		if (arrMatches[2]) {
			// We found a quoted value. When we capture
			// this value, unescape any double quotes.
			strMatchedValue = arrMatches[2].replace(new RegExp('""', 'g'), '"');
		} else {
			// We found a non-quoted value.
			strMatchedValue = arrMatches[3];
		}

		// Now that we have our value string, let's add
		// it to the data array.
		arrData[arrData.length - 1].push(strMatchedValue);
	}

	// Return the parsed data.
	return arrData;
}

export function normalizeString(text?: string) {
	if (!text) return text;
	return text
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/  |\r\n|\n|\r/gm, '')
		.toLowerCase();
}

export function createOrUpdateNotificationBar(text: string) {
	var div = document.querySelector('#rvp-notification-bar');
	if (!div) {
		div = document.createElement('div');
		div.id = 'rvp-notification-bar';
		div.classList.add('notification-container');
		document.body.appendChild(div);

		const img = document.createElement('img');
		img.setAttribute('src', chrome.runtime.getURL('images/icon.png'));
		img.classList.add('rvp-notification-bar-image');
		div.appendChild(img);

		const span = document.createElement('span');
		span.innerHTML = text;
		div.appendChild(span);
	} else {
		div.querySelector('span').innerText = text;
	}
}

export function findClosestDate(date: string, dates: string[]) {
	const time = new Date(date).getTime();
	const filtered = dates.filter(it => time >= new Date(it).getTime());
	filtered.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
	return filtered[0];
}
