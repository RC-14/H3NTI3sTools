import { qs, isElementEditable } from '/src/lib/utils';
import { addNextPreviousShortcuts } from '/src/lib/nextPreviousShortcuts';
import state from './state';
import { applyCustomReaderSettings } from './readerSettingsUtils';

const next = () => {
	qs<HTMLAnchorElement>('a.next')?.click();
};
const previous = () => {
	qs<HTMLAnchorElement>('a.previous')?.click();
};

if (state === 'browsing' || state === 'searching') {
	addNextPreviousShortcuts(next, previous);
} else if (state === 'reading') {
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
				if (event.shiftKey) {
					previous();
				} else {
					next();
				}
				break;
		}
	});
} else if (state === 'lookingAtGallery') {
	document.addEventListener('keydown', (event) => {
		if (event.code !== 'Space' || isElementEditable(event.target as HTMLElement)) return;

		const firstPageLink = qs('#cover a');
		if (firstPageLink instanceof HTMLAnchorElement) firstPageLink.click();
	});
};
