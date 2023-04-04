// The only purpose of the next two lines is to allow compilation of this file even though it isn't a module
// @ts-ignore
const _not_a_module_ = 0;

const isFrame = window.self !== window.top;

const isValidContentScriptEntry = (entry: unknown): entry is { matches: string[], js: string[], all_frames?: boolean; } => {
	if (typeof entry !== 'object' || entry === null) return false;

	if (!('matches' in entry && Array.isArray(entry.matches))) return false;

	for (let i = 0; i < entry.matches.length; i++) {
		if (typeof entry.matches[i] !== 'string') return false;
	}

	if (!('js' in entry && Array.isArray(entry.js))) return false;

	for (let i = 0; i < entry.js.length; i++) {
		if (typeof entry.js[i] !== 'string') return false;
	}

	if ('all_frames' in entry && typeof entry.all_frames !== 'boolean') return false;

	return true;
};

fetch(chrome.runtime.getURL('contentScripts.json'))
	.then(response => response.json())
	.then((jsonResult) => {
		if (!Array.isArray(jsonResult)) throw new Error('Error when parsing contentScripts.json: contentScripts.json is not an Array.');

		const contentScripts: { matches: string[], js: string[], all_frames?: boolean; }[] = [];

		for (let i = 0; i < jsonResult.length; i++) {
			const entry = jsonResult[i];

			if (!isValidContentScriptEntry(entry)) throw new Error(`Error when parsing contentScripts.json: the ${i}th entry is malformed.`);

			contentScripts.push(entry);
		}

		for (let i = 0; i < contentScripts.length; i++) {
			const entry = contentScripts[i];

			if (isFrame && !entry.all_frames) continue;

			const inject = entry.matches.some((match) => {
				if (match === '<all_urls>') return true;
				return `.${location.host}`.endsWith(`.${match}`);
			});

			if (inject) {
				for (let j = 0; j < entry.js.length; j++) {
					const script = entry.js[j];
					import(chrome.runtime.getURL(`content/js/${script}`));
				}
			}
		}
	});
// Stop VSCode from indenting

import(chrome.runtime.getURL('utils.js')).then((utils) => {
	Object.defineProperties(
		window,
		{
			qs: {
				value: utils.qs
			},
			qsa: {
				value: utils.qsa
			},
			StorageHelper: {
				value: utils.StorageHelper
			}
		}
	);
});
