import { qs, qsa, isElementEditable } from '../../utils.js';

const isReading = () => {
	return location.pathname.match(/^\/g\/\d{1,6}\/\d+\/?$/gi) !== null;
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

const addHeightToGallery = (imgElem: HTMLImageElement) => {
	if (!imgElem.parentElement?.parentElement?.classList.contains('gallery')) return;

	imgElem.parentElement.style.setProperty('--height', `${imgElem.height}px`);
};

if (isSearching() || isBrowsing()) {
	document.addEventListener('keydown', (event) => {
		if (isElementEditable(event.target as HTMLElement)) return;

		switch (event.code) {
			case 'ArrowLeft':
				if (qs('.previous')) qs<HTMLAnchorElement>('.previous')?.click();
				break;

			case 'ArrowRight':
				if (qs('.next')) qs<HTMLAnchorElement>('.next')?.click();
				break;

			default:
				break;
		}
	});
} else if (isReading()) {
	const navBar = qs<HTMLElement>(`nav[role="navigation"]`);
	if (navBar) navBar.style.position = 'position: unset;';

	document.addEventListener('keydown', (event) => {
		if (isElementEditable(event.target as HTMLElement)) return;

		switch (event.code) {
			case 'Escape':
				setTimeout(() => {
					open(qs<HTMLAnchorElement>('.go-back')?.href, '_self');
				}, 100);
				break;

			default:
				break;
		}
	});
}

document.addEventListener('readystatechange', () => {
	if (document.readyState !== 'interactive') return;

	qsa<HTMLImageElement>('div.gallery > a > img').forEach((elem) => {
		elem.addEventListener('load', () => {
			addHeightToGallery(elem);
		});
	});
});
