import { qs } from '/src/lib/utils';

if (location.pathname.startsWith('/comic/') && location.pathname.split('/').length === 3) {
	/* 
	 * Fuck Websites that load their content with JS
	 * 
	 * Automatically sets the language filter for chapters to english
	 */
	new MutationObserver((mutations, observer) => {
		let found = false;

		for (const mutation of mutations) {
			if (mutation.addedNodes.length === 0) continue;

			for (const node of mutation.addedNodes) {
				if (!(node instanceof HTMLSelectElement)) continue;

				const selectElem = qs<HTMLSelectElement>('main #chapter-header+div select:has(>[value="en"])');
				if (selectElem == null) continue;

				selectElem.value = 'en';
				observer.disconnect();
				found = true;
				break;
			}

			if (found) break;
		}
	}).observe(document.documentElement, {
		childList: true,
		subtree: true
	});
}
