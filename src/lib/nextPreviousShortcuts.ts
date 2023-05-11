import { isElementEditable } from './utils';

let listenerAttached = false;

let previousHandler = () => { };
let nextHandler = () => { };

const eventListener = (event: KeyboardEvent) => {
	// Don't do anything if the user can write text in the target element.
	if (event.target instanceof HTMLElement && isElementEditable(event.target)) return;

	switch (event.code) {
		case 'ArrowLeft':
			previousHandler();
			break;

		case 'ArrowRight':
			nextHandler();
			break;

		default:
			return;
	}

	event.preventDefault();
	event.stopImmediatePropagation();
};

/**
 * Add the listener for the shortcuts.
 * 
 * @param next The function that opens the next page.
 * 
 * @param previous The function that opens the previous page.
 */
export const addShortcuts = (next: typeof nextHandler, previous: typeof previousHandler) => {
	if (listenerAttached) return;

	nextHandler = next;
	previousHandler = previous;

	document.addEventListener('keydown', eventListener, { capture: true });

	listenerAttached = true;
};

/**
 * Remove the listener for the shortcuts.
 */
export const removeShortcuts = () => {
	if (!listenerAttached) return;

	document.removeEventListener('keydown', eventListener, { capture: true });

	listenerAttached = false;
};

/**
 * Check if the shortcuts listener is attached.
 * 
 * @returns `true` if the listener to realize the shortcuts is attached and `false` otherwise.
 */
export const shortcutListenerAttached = () => listenerAttached;
