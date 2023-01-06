import { qsa } from '../../utils.js';

const loadHighResImages = () => {
	const imgElements = qsa<HTMLImageElement>('.post__thumbnail > .fileThumb.image-link > img:only-child');

	// The images need to be clicked to trigger an event listener that then loads the high res version.
	imgElements.forEach(elem => elem.click());
};

// Make sure the page shows a post
if (location.pathname.match(/^\/\w+\/user\/\d+\/post\/\d+/i)) {
	if (document.readyState === 'complete') {
		loadHighResImages();
	} else {
		document.addEventListener('readystatechange', () => {
			if (document.readyState !== 'complete') return;

			loadHighResImages();
		});
	}
}
