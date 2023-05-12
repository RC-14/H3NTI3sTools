import { addNextPreviousShortcuts } from '/src/lib/nextPreviousShortcuts';
import { qs } from '/src/lib/utils';

const previousChapter = () => {
	qs<HTMLAnchorElement>('a.ch-prev-btn')?.click();
};
const nextChapter = () => {
	qs<HTMLAnchorElement>('a.ch-next-btn')?.click();
};

addNextPreviousShortcuts(nextChapter, previousChapter);
