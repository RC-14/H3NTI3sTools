import { addNextPreviousShortcuts } from '/src/lib/nextPreviousShortcuts';
import { qs, runAfterReadyStateReached } from '/src/lib/utils';

const removeUglyWhitBoxAtBottom = () => {
	qs('._1QUKS')?.remove();
};

const previousChapter = () => {
	qs<HTMLAnchorElement>('.previous > a')?.click();
};
const nextChapter = () => {
	qs<HTMLAnchorElement>('.next > a')?.click();
};

// Stop MangaHub from changing the page with JS instead of using a redirect
document.addEventListener('click', (event) => {
	if (!(event.target instanceof HTMLAnchorElement)) return;
	if (!event.target.href.length) return;

	event.preventDefault();
	open(event.target.href, '_self');
});

runAfterReadyStateReached('complete', removeUglyWhitBoxAtBottom);

addNextPreviousShortcuts(nextChapter, previousChapter);
