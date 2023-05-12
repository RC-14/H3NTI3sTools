import { addNextPreviousShortcuts } from '/src/lib/nextPreviousShortcuts';
import { qs, qsa } from '/src/lib/utils';

// Stop MangaHub from changing the page with JS instead of using a redirect
document.addEventListener('click', (event) => {
	if (!(event.target instanceof HTMLAnchorElement)) return;
	if (!event.target.href.length) return;

	event.preventDefault();
	open(event.target.href, '_self', 'noreferrer');
});

// Sadly MangaHub loads parts of the page only when the user scrolls to it.
document.addEventListener('scroll', () => {
	// Remove image numbers
	qsa('._3w1ww').forEach((elem) => elem.remove());
	// Remove the ugly white box at the bottom
	qs('._1QUKS')?.remove();
});

const previousChapter = () => {
	qs<HTMLAnchorElement>('.previous > a')?.click();
};
const nextChapter = () => {
	qs<HTMLAnchorElement>('.next > a')?.click();
};

addNextPreviousShortcuts(nextChapter, previousChapter);
