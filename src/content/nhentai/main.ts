import { applyCustomReaderSettings } from './readerSettingsUtils';
import { addEnglishAndFullColorButtons, addUseInSearchButton } from './searchConveniences';
import state from './state';
import { addNextPreviousShortcuts } from '/src/lib/nextPreviousShortcuts';
import { isElementEditable, qs, runAfterReadyStateReached } from '/src/lib/utils';

const next = () => {
	qs<HTMLAnchorElement>('a.next')?.click();
};
const previous = () => {
	qs<HTMLAnchorElement>('a.previous')?.click();
};

runAfterReadyStateReached('complete', addEnglishAndFullColorButtons);

switch (state) {
	case 'browsing':
		if (['artist', 'category', 'character', 'group', 'language', 'parody', 'tag'].includes(location.pathname.split('/')[1]!)) {
			runAfterReadyStateReached('complete', addUseInSearchButton);
		}
	case 'searching':
		addNextPreviousShortcuts(next, previous);
		break;

	case 'reading':
		applyCustomReaderSettings();

		document.addEventListener('keydown', (event) => {
			if (isElementEditable(event.target as HTMLElement)) return;

			switch (event.code) {
				case 'Escape':
					event.preventDefault();
					setTimeout(() => {
						qs<HTMLAnchorElement>('a.go-back')?.click();
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
		break;

	case 'lookingAtGallery':
		document.addEventListener('keydown', (event) => {
			if (event.code !== 'Space' || isElementEditable(event.target as HTMLElement)) return;

			const firstPageLink = qs('#cover a');
			if (firstPageLink instanceof HTMLAnchorElement) firstPageLink.click();
		});
		break;

	case 'unknown':
		break;
}
