import { hideContent } from './hideContent';
import { noImageClick } from './noImageClick';
import { removeDuplicateImages } from './removeDuplicateImages';
import { runAfterReadyStateReached } from '/src/lib/utils';

// Make sure the page shows a post
if (location.pathname.match(/^\/\w+\/user\/\d+\/post\/\d+/i)) {
	runAfterReadyStateReached('interactive', () => {
		hideContent();
		removeDuplicateImages();
	});

	runAfterReadyStateReached('complete', noImageClick);
}
