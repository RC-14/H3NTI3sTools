import { qs, sendRuntimeMessage, StorageHelper } from '../../utils.js';

const storage = new StorageHelper('session', 'pixivViewer');

const link = qs<HTMLAnchorElement>('a#link');
const showButton = qs<HTMLButtonElement>('button#showButton');
const selectButton = qs<HTMLButtonElement>('button#selectButton');
const clearButton = qs<HTMLButtonElement>('button#clearButton');

if (link == null || showButton == null || selectButton == null || clearButton == null) {
	document.body.innerText = 'Fatal error: required elements not found';
	throw new Error('[pixivViewer popup] Required elements not found');
}

/*
 * Helper functions
 */
const setElementInactive = (element: HTMLElement) => element.classList.add('inactive');
const isElementInactive = (element: HTMLElement) => element.classList.contains('inactive');
const setElementActive = (element: HTMLElement) => element.classList.remove('inactive');

/*
 * UI update functions
 */
const updateShowButton = (artworks: PixivViewer.Artwork[]) => {
	if (artworks.length < 1) {
		setElementInactive(showButton);
		return;
	}
	setElementActive(showButton);
};

const updateSelectButton = (isSelecting: boolean) => {
	selectButton.innerText = isSelecting ? 'Stop' : 'Start';
	setElementActive(selectButton);
};

const updateClearButton = (artworks: PixivViewer.Artwork[]) => {
	if (artworks.length === 0) {
		setElementInactive(clearButton);
		return
	}
	setElementActive(clearButton);
};

/*
 * Listener
 */
storage.addChangeListener((changes) => {
	if (typeof changes.isSelecting?.newValue === 'boolean') {
		updateSelectButton(changes.isSelecting.newValue);
	}

	if (typeof changes.selection === 'object' && changes.selection !== null) {
		const selection: unknown = changes.selection.newValue;

		if (Array.isArray(selection)) {
			updateShowButton(selection);
			updateClearButton(selection);
		} else {
			storage.set({ selection: [] });
		}
	}
});

document.addEventListener('click', (event) => {
	if (!(event.target instanceof HTMLElement)) return;
	if (!isElementInactive(event.target)) return;

	event.stopImmediatePropagation();
	event.preventDefault();
}, { capture: true });

selectButton.addEventListener('click', async (event) => {
	setElementInactive(selectButton);
	storage.set({ isSelecting: !await storage.get('isSelecting') });
});

clearButton.addEventListener('click', (event) => {
	setElementInactive(clearButton);
	storage.set({ selection: [] });
});

showButton.addEventListener('click', (event) => {
	const messageData: PixivViewer.ShowMessageData = { tabId: null };
	sendRuntimeMessage('worker', 'pixivViewer', 'showSelection', messageData);
});

/*
 * UI preparations
 */
link.href = chrome.runtime.getURL('sites/pixivViewer/index.html');

storage.get('isSelecting').then((isSelecting) => updateSelectButton(isSelecting as boolean));

storage.get('selection').then((selection) => {
	if (!Array.isArray(selection)) {
		storage.set({ selection: [] as PixivViewer.Artwork[] });
		return;
	}
	updateClearButton(selection);
	updateShowButton(selection);
});
