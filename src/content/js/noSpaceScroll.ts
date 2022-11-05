import { isElementEditable } from '../../utils.js';

document.addEventListener('keypress', (event) => {
	// Make sure that it's possible to write text
	if (event.target instanceof HTMLElement && isElementEditable(event.target)) return;

	// Don't scroll when space is pressed
	if (event.code === 'Space') {
		event.preventDefault();
	}
}, { capture: true });
