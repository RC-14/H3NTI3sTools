import { z } from 'zod';
import StorageHelper from './StorageHelper';
import { sendRuntimeMessage } from './utils';

const BooleanSchema = z.boolean();

const STORAGE_KEY = 'hidden';

const storage = new StorageHelper('local', 'hideCursor');

let hidden = false;
let listenersAttached = false;

/**
 * Prevents the context menu from appearing and showing the cursor.
 * 
 * @param event A mouse event object.
 */
const contextmenuListener = (event: MouseEvent) => {
	event.preventDefault();
	event.stopImmediatePropagation();
};

const updateGlobalState = async () => {
	if (listenersAttached) await storage.set(STORAGE_KEY, hidden);
};

/**
 * Hides the cursor.
 */
export const hideCursor = async () => {
	if (hidden) return;

	await sendRuntimeMessage('background', 'hideCursor', 'hide');

	document.addEventListener('contextmenu', contextmenuListener, { capture: true });

	hidden = true;
	await updateGlobalState();
};

/**
 * Shows the cursor.
 */
export const showCursor = async () => {
	if (!hidden) return;

	await sendRuntimeMessage('background', 'hideCursor', 'show');

	document.removeEventListener('contextmenu', contextmenuListener, { capture: true });

	hidden = false;
	await updateGlobalState();
};

/**
 * Check if the cursor is hidden
 * 
 * @returns `true` if the cursor is hidden `false` otherwise.
 */
export const isCursorHidden = () => hidden;

/**
 * Adjust the local state to be in line with the global state.
 */
const updateLocalState = async () => {
	const globalStateParse = BooleanSchema.safeParse(await storage.get(STORAGE_KEY));

	const globalState = globalStateParse.success ? globalStateParse.data : false;

	if (globalState === hidden) return;

	if (globalState === true) {
		await hideCursor();
	} else {
		await showCursor();
	}
};

/**
 * A keyboard event listener which toggles the cursor visibility.
 * 
 * @param event A keyboard event object.
 */
const keydownListener = (event: KeyboardEvent) => {
	if (!event.altKey || event.code !== 'KeyH') return;

	if (hidden) {
		showCursor();
		return;
	}
	hideCursor();
};

/**
 * A visibility change listener which updates the local state when the tab gets visible.
 * 
 * @param event A generic event object.
 */
const visibilityChangeListener = (event: Event) => {
	if (document.visibilityState === 'hidden') return;

	updateLocalState();
};

/**
 * Add a keydown which toggles the cursor visibility
 * and a visibility change listener which adjusts the local state to be in line with other tabs when the tab gets visible.
 */
export const addHideCursorListeners = () => {
	if (listenersAttached) return;

	document.addEventListener('keydown', keydownListener, { capture: true, passive: true });
	document.addEventListener('visibilitychange', visibilityChangeListener, { capture: true, passive: true });

	listenersAttached = true;

	updateLocalState();
};

/**
 * Removes the listeners added by `addHideCursorListeners()`.
 */
export const removeHideCursorListeners = () => {
	if (!listenersAttached) return;

	document.removeEventListener('keydown', keydownListener, { capture: true });
	document.removeEventListener('visibilitychange', visibilityChangeListener, { capture: true });

	listenersAttached = false;
};

/**
 * Check if the listeners are currently attached.
 * 
 * @returns `true` if the listeners are attached and `false` otherwise.
 */
export const hideCursorListenersAttached = () => listenersAttached;
