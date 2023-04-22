import { qs, isElementEditable } from '../../utils.js';

const isReading = () => {
	return location.pathname.match(/^\/g\/\d+\/\d+\/?$/i) !== null;
};

const isLookingAtGalary = () => {
	return location.pathname.match(/^\/g\/\d+\/?$/i) !== null;
};

const isSearching = () => {
	return location.pathname.startsWith('/search/') && location.search !== '';
};

const isBrowsing = () => {
	if (location.pathname === '' || location.pathname === '/') return true;

	let paths = ['/artist/', '/group/', '/parody/', '/character/', '/tag/'];

	for (let i = 0; i < paths.length; i++) {
		if (location.pathname.startsWith(paths[i]) && location.pathname !== paths[i]) return true;
	}

	return false;
};

const setReaderSettings = () => {
	const READER_KEY = 'reader';

	const defaultSettings = {
		version: 2,
		preload: 5,
		turning_behavior: 'right',
		image_scaling: 'fit-both',
		jump_on_turn: 'image',
		scroll_speed: 5,
		zoom: 100
	};

	const readerSettings = JSON.parse(localStorage.getItem(READER_KEY) ?? 'null');

	if (
		typeof readerSettings === 'object' &&
		readerSettings !== null &&
		'version' in readerSettings &&
		readerSettings.version !== defaultSettings.version
	) throw new Error(`New version (${readerSettings.version}) for nhentai reader settings.`);

	localStorage.setItem(READER_KEY, JSON.stringify(defaultSettings));
};

if (isSearching() || isBrowsing()) {
	document.addEventListener('keydown', (event) => {
		if (event.target instanceof HTMLElement && isElementEditable(event.target)) return;

		switch (event.code) {
			case 'ArrowLeft':
				const previous = qs('a.previous');
				if (previous instanceof HTMLAnchorElement) previous.click();
				break;

			case 'ArrowRight':
				const next = qs('a.next');
				if (next instanceof HTMLAnchorElement) next.click();
				break;

			default:
				break;
		}
	});
} else if (isReading()) {
	setReaderSettings();

	document.addEventListener('keydown', (event) => {
		if (isElementEditable(event.target as HTMLElement)) return;

		switch (event.code) {
			case 'Escape':
				setTimeout(() => {
					const back = qs('a.go-back');
					if (back instanceof HTMLAnchorElement) back.click();
				}, 100);
				break;

			case 'Space':
				const button = qs(`a.${event.shiftKey ? 'previous' : 'next'}`);
				if (button instanceof HTMLAnchorElement) button.click();
				break;

			default:
				break;
		}
	});
} else if (isLookingAtGalary()) {
	document.addEventListener('keydown', (event) => {
		if (isElementEditable(event.target as HTMLElement)) return;

		switch (event.code) {
			case 'Space':
				const firstPageLink = qs('#cover a');
				if (firstPageLink instanceof HTMLAnchorElement) firstPageLink.click();
				break;

			default:
				break;
		}
	});
}
