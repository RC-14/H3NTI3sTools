import { qs, isElementEditable } from '../../utils.js';

const CUSTOM_READER_SETTINGS: Nhentai.ReaderSettings = {
	version: 2,
	preload: 5,
	turning_behavior: 'right',
	image_scaling: 'fit-both',
	jump_on_turn: 'image',
	scroll_speed: 5,
	zoom: 100
};
const READER_SETTINGS_STORAGE_KEY = 'reader';
const READER_SETTING_VERSION: Nhentai.ReaderSettings['version'] = CUSTOM_READER_SETTINGS.version;
const READER_SETTINGS_KEYS = Object.keys(CUSTOM_READER_SETTINGS) as readonly (keyof Nhentai.ReaderSettings)[];

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

const getReaderSettings = (): Nhentai.ReaderSettings | null => {
	const readerSettings = JSON.parse(localStorage.getItem(READER_SETTINGS_STORAGE_KEY) ?? 'null');

	if (readerSettings === null) return readerSettings;

	if (typeof readerSettings !== 'object') throw new Error("Got something for reader settings that isn't an object.");
	if (!('version' in readerSettings)) throw new Error("Reader settings object doesn't have a version.");
	if (READER_SETTING_VERSION !== readerSettings.version) throw new Error(`New version (${readerSettings.version}) for nhentai reader settings.`);

	for (const key of Object.keys(readerSettings)) {
		if (!READER_SETTINGS_KEYS.includes(key)) throw new Error("Unknown setting for nhentai reader settings.");
	}

	return readerSettings as Nhentai.ReaderSettings; // using `as` because I'm too lazy to check properly and - you know - what's the worst that could happen?
};

const setReaderSettings = (settings: Nhentai.ReaderSettings) => {
	localStorage.setItem(READER_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
};

const applyCustomReaderSettings = () => {
	const readerSettings = getReaderSettings();

	if (readerSettings !== null) {
		let alreadySet = true;

		for (const key of Object.keys(readerSettings) as (keyof typeof readerSettings)[]) {
			if (readerSettings[key] === CUSTOM_READER_SETTINGS[key]) continue;

			alreadySet = false;
			break;
		}

		if (alreadySet) return;
	}

	setReaderSettings(CUSTOM_READER_SETTINGS);
	location.reload();
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
	applyCustomReaderSettings();

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
