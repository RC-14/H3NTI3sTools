import { addNextPreviousShortcuts } from '/src/lib/nextPreviousShortcuts';
import { qs } from '/src/lib/utils';

const previousChapter = () => {
	qs<HTMLAnchorElement>('nav > div:first-child > a:first-child')?.click();
};
const nextChapter = () => {
	qs<HTMLAnchorElement>('nav > div:last-child > a:last-child')?.click();
};

addNextPreviousShortcuts(nextChapter, previousChapter);
