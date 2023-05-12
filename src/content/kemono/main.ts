import { hideContent } from './hideContent';
import { noImageClick } from './noImageClick';
import { removeDuplicateImages } from './removeDuplicateImages';

// Make sure the page shows a post
if (location.pathname.match(/^\/\w+\/user\/\d+\/post\/\d+/i)) {
	if (document.readyState === 'interactive' || document.readyState === 'complete') {
		hideContent();
		removeDuplicateImages();
	} else {
		document.addEventListener('readystatechange', () => {
			if (document.readyState !== 'interactive') return;

			hideContent();
			removeDuplicateImages();
		});
	}

	// Load High res versions
	if (document.readyState === 'complete') {
		noImageClick();
	} else {
		document.addEventListener('readystatechange', () => {
			if (document.readyState !== 'complete') return;

			noImageClick();
		});
	}
}
