import { addNextPreviousShortcuts } from '/src/lib/nextPreviousShortcuts';
import { qs } from '/src/lib/utils';

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

addNextPreviousShortcuts(nextChapter, previousChapter);
