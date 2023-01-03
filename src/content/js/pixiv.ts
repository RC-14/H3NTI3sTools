import { qsa, isElementEditable } from '../../utils.js';

// Switch pages with arrow keys
document.addEventListener("keydown", (event) => {
	if (event.target instanceof HTMLElement && isElementEditable(event.target)) return;

	const pageButtons = Array.from(qsa('nav > a[href^="' + location.pathname + '?p="] > svg')).map(elem => elem.parentElement);
	// Maybe the page doens't have next and previous buttons
	if (pageButtons.length === 0) return;
	// Only happens if something went wrong
	if (pageButtons.length !== 2) throw new Error(`Not the right amount of elements. Expected 2, got ${pageButtons.length}`);

	const previousButton = pageButtons[0];
	const nextButton = pageButtons[1];

	if (!(previousButton instanceof HTMLAnchorElement)) throw new Error("Previous button isn't an anchor element");
	if (!(nextButton instanceof HTMLAnchorElement)) throw new Error("Next button button isn't an anchor element");

	switch (event.code) {
		case "ArrowLeft":
			if (!previousButton.hidden) previousButton.click();
			break;

		case "ArrowRight":
			if (!nextButton.hidden) nextButton.click();
			break;
	}
});
