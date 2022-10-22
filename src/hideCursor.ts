import { sendRuntimeMessage, StorageHelper } from './utils.js';

const storage = new StorageHelper('session', 'hideCursor');
let isCursorHidden = false;

const styleElement = document.createElement('style');
/* 
 * Sadly I can't get rid of this innerHTML because innerText might encode
 * characters and adoptedStyleSheets gets shared with the website JS.
 */
styleElement.innerHTML = `
* {
	/* Hide the cursor */
	cursor: none !important;

	/* Disable cursor functions */
	pointer-events: none !important;
	user-select: none !important;
}
`;

const hideCursor = () => {
	document.documentElement.append(styleElement);
	isCursorHidden = true;
};

const showCursor = () => {
	styleElement.remove();
	isCursorHidden = false;
};

const storageChangeListener = (changes: { [key: string]: chrome.storage.StorageChange; }) => {
	if (changes.isCursorHidden === undefined) return;

	if (changes.isCursorHidden.newValue) {
		hideCursor();
	} else {
		showCursor();
	}
};

const keydownListener = (event: KeyboardEvent) => {
	if (!event.altKey || event.code !== 'KeyH') return;

	storage.set({ isCursorHidden: !isCursorHidden });
};

export const addListeners = async () => {
	// If Alt + F get pressed, toggle fullscreen
	document.addEventListener('keydown', keydownListener, {
		passive: true,
		capture: true
	});

	storage.addChangeListener(storageChangeListener);

	storage.get('isCursorHidden').then((result) => {
		if (typeof result !== 'boolean' || !result) return;

		hideCursor();
	});
};

export const removeListeners = () => {
	document.removeEventListener('keydown', keydownListener, {
		capture: true
	});

	storage.removeChangeListener(storageChangeListener);

	if (!isCursorHidden) return;
	showCursor();
};
