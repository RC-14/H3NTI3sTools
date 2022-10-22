import { qsa, isElementEditable } from '../../utils.js';

// Switch pages with arrow keys
document.addEventListener("keydown", (event) => {
	// Don't even try if the path is not right (check needs to be here because pixiv doesn't redirect but only load new stuff in the existing page)
	if (
		location.pathname.match(/^\/(?:\w\w\/)?users\/\d+\/.+/gi) === null &&
		location.pathname.match(/^\/(?:\w\w\/)?tags\/[^\/]+\/.+/gi) === null
	) return;

	if (event.target instanceof HTMLElement) {
		if (isElementEditable(event.target)) return;
	}

	const pageButtons = qsa<HTMLAnchorElement>('.sc-d98f2c-0.sc-xhhh7v-2.cCkJiq.sc-xhhh7v-1-filterProps-Styled-Component.fIxZrk');
	if (pageButtons.length !== 2) throw new Error(`Not the right amount of elements. Expected 2, got ${pageButtons.length}`);

	const previousButton = pageButtons[0];
	const nextButton = pageButtons[1];

	switch (event.code) {
		case "ArrowLeft":
			if (!previousButton.hidden) previousButton.click();
			break;

		case "ArrowRight":
			if (!nextButton.hidden) nextButton.click();
			break;
	}
});
