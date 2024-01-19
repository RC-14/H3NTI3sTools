import { addNextPreviousShortcuts } from '../../lib/nextPreviousShortcuts';
import { qs } from '/src/lib/utils';

const currentlyReading = location.pathname.startsWith('/s/');

const next = () => {
	qs<HTMLAnchorElement | HTMLTableCellElement>('a#next, a#unext, .gtb td:last-child:has(> a)')?.click();
};

const prev = () => {
	qs<HTMLAnchorElement | HTMLTableCellElement>('a#prev, a#uprev, .gtb td:first-child:has(> a)')?.click();
};

addNextPreviousShortcuts(next, prev, currentlyReading);
