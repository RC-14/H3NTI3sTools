const isFrame = window.self !== window.top;

fetch(chrome.runtime.getURL('contentScripts.json'))
	.then(response => response.json())
	.then((contentScripts: { matches: string[], js: string[], all_frames?: boolean; }[]) => {
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
