import { addNextPreviousShortcuts } from '/src/lib/nextPreviousShortcuts';
import { qs } from '/src/lib/utils';

const next = () => qs<HTMLButtonElement>('button.js-page_next')?.click();
const previous = () => qs<HTMLButtonElement>('button.js-page_previous')?.click();

addNextPreviousShortcuts(next, previous, true);
