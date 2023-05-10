import { addShortcuts } from '/src/lib/nextPreviousShortcuts';
import { qsa } from '/src/lib/utils';

const getButtons = () => {
	const buttons = Array.from(qsa('nav > a[href^="' + location.pathname + '?p="] > svg')).map(elem => elem.parentElement);

	// Maybe the page doesn't have next and previous buttons
	if (buttons.length === 0) return null;

	// Only happens if something went wrong
	if (buttons.length !== 2) throw new Error(`Not the right amount of elements. Expected 2, got ${buttons.length}`);

	const previous = buttons[0];
	const next = buttons[1];

	if (!(previous instanceof HTMLAnchorElement)) throw new Error("Previous button isn't an anchor element");
	if (!(next instanceof HTMLAnchorElement)) throw new Error("Next button button isn't an anchor element");

	return {
		previous,
		next
	};
};

const previous = () => {
	getButtons()?.previous.click();
};

const next = () => {
	getButtons()?.next.click();
};

addShortcuts(next, previous);
