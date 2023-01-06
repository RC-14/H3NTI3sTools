import { qs, qsa, showMessage, isElementEditable } from '../../utils.js';

const loadHighResButton = document.createElement('button');
loadHighResButton.id = 'h3nti3-load-high-res-button';
loadHighResButton.innerText = 'Load high res images';

loadHighResButton.addEventListener('click', (event) => {
	if (document.readyState !== 'complete') {
		showMessage("Page didn't finish loading yet...", {
			color: 'yellow',
			size: 'xx-large'
		});
		return;
	}

	const imgElements = qsa<HTMLImageElement>('.post__thumbnail > .fileThumb.image-link > img:only-child');

	// The images need to be clicked to trigger an event listener that then loads the high res version.
	imgElements.forEach(elem => elem.click());

	// The button is now useless so we might as well remove it.
	loadHighResButton.remove();
});

document.addEventListener('keydown', (event) => {
	if (event.target instanceof HTMLElement && isElementEditable(event.target)) return;
	if (event.code !== 'Space') return;
	// Don't press the button if it's not in the DOM
	if (loadHighResButton.parentElement === null) return;

	loadHighResButton.click();
});

const addLoadHighResButton = () => {
	const postFilesContainer = qs<HTMLDivElement>('div.post__files');

	if (!(postFilesContainer instanceof HTMLDivElement)) throw new Error("Can't find post files container.");

	postFilesContainer.before(loadHighResButton);
};

// Make sure the page shows a post
if (location.pathname.match(/^\/\w+\/user\/\d+\/post\/\d+/i)) {
	// Depending on the internet connection appending the button might fail.
	try {
		addLoadHighResButton();
	} catch (error) {
		// In that case we wait for the page to load and retry.
		document.addEventListener('readystatechange', () => {
			if (document.readyState === 'loading') return;

			addLoadHighResButton();
		}, { once: true });
	}
}
