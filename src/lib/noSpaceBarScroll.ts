import { isElementEditable } from './utils';

let spaceBarScrollAllowed = true;

const eventListener = (event: KeyboardEvent) => {
	// Make sure that it's possible to write text
	if (event.target instanceof HTMLElement && isElementEditable(event.target)) return;

	// Don't scroll when space is pressed
	if (event.code === 'Space') {
		event.preventDefault();
	}
};

/**
 * Prevent scrolling by pressing the space bar.
 */
export const preventSpaceBarScroll = () => {
	if (!spaceBarScrollAllowed) return;

	document.addEventListener('keydown', eventListener, { capture: true });
	spaceBarScrollAllowed = false;
};

/**
 * Allow scrolling by pressing the space bar.
 */
export const allowSpaceBarScroll = () => {
	if (spaceBarScrollAllowed) return;

	document.removeEventListener('keydown', eventListener, { capture: true });
	spaceBarScrollAllowed = true;
};

/**
 * Check if scrolling with the space bar is allowed.
 * 
 * @returns `true` if scrolling by pressing the space bar is allowed and `false` otherwise.
 */
export const isSpaceBarScrollAllowed = () => spaceBarScrollAllowed;
