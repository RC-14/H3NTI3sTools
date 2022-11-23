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
				const next = qs('a.next');
				if (next instanceof HTMLAnchorElement) next.click();
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
