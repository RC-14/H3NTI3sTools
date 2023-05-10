import { addShortcuts } from '/src/lib/nextPreviousShortcuts';
import { qs } from '/src/lib/utils';

const previousChapter = () => {
	qs<HTMLAnchorElement>('a._prevEpisode')?.click();
};
const nextChapter = () => {
	qs<HTMLAnchorElement>('a._nextEpisode')?.click();
};

addShortcuts(nextChapter, previousChapter);
