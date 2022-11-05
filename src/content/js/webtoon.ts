import { qs, isElementEditable } from '../../utils.js';

const chapterButtons = {
	previous: null as HTMLAnchorElement | null,
	next: null as HTMLAnchorElement | null,
};

const getChapterButtons = () => {
	if (!chapterButtons.previous) chapterButtons.previous = qs('a._prevEpisode');
	if (!chapterButtons.next) chapterButtons.next = qs('a._nextEpisode');
};

const previousChapter = () => {
	chapterButtons.previous?.click();
};
const nextChapter = () => {
	chapterButtons.next?.click();
};

document.addEventListener('keydown', (event) => {
	// Return if the user can write text in the target element
	if (event.target instanceof HTMLElement && isElementEditable(event.target)) return;

	getChapterButtons();

	switch (event.code) {
		case 'ArrowLeft':
			previousChapter();
			break;

		case 'ArrowRight':
			nextChapter();
			break;
	}
});
