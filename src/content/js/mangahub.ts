import { qs, qsa, isElementEditable } from '../../utils.js';

const chapterButtons = {
	previous: null as HTMLAnchorElement | null,
	next: null as HTMLAnchorElement | null,
};

const getChapterButtons = () => {
	if (!chapterButtons.previous) chapterButtons.previous = qs<HTMLAnchorElement>('.previous > a');
	if (!chapterButtons.next) chapterButtons.next = qs<HTMLAnchorElement>('.next > a');
};

const previousChapter = () => {
	chapterButtons.previous?.click();
};
const nextChapter = () => {
	chapterButtons.next?.click();
};

const removeImgNumbers = () => {
	qsa('._3w1ww').forEach((elem) => elem.remove());
};

const removeUglyWhiteBox = () => {
	qs('._1QUKS')?.remove();
};

// Sadly MangaHub loads parts of the page only when the user scrolls to it.
document.addEventListener('scroll', () => {
	removeImgNumbers();
	removeUglyWhiteBox();
});

// Stop MangaHub from changing the page with JS instead of using a redirect
document.addEventListener('click', (event) => {
	if (!(event.target instanceof HTMLAnchorElement)) return;
	if (!event.target.href.length) return;

	event.preventDefault();
	open(event.target.href, '_self', 'noreferrer');
});

document.addEventListener('keydown', (event) => {
	if (event.target instanceof HTMLElement) {
		if (isElementEditable(event.target)) return;
	}

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
