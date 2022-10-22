import { isElementEditable } from '../../utils.js';

document.addEventListener('keypress', (event) => {
	// Make sure that it's possible to write text
	if (isElementEditable(event.target as HTMLElement)) return;

	// Don't scroll when space is pressed
	if (event.code === 'Space') {
		event.preventDefault();
	}
}, { capture: true });
