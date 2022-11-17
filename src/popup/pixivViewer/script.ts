import { qs, StorageHelper } from '../../utils.js';

const storage = new StorageHelper('session', 'pixivViewer');

const link = qs<HTMLAnchorElement>('a#link');
const showLink = qs<HTMLAnchorElement>('a#showLink');
const selectButton = qs<HTMLButtonElement>('button#selectButton');
const clearButton = qs<HTMLButtonElement>('button#clearButton');

if (link == null || showLink == null || selectButton == null || clearButton == null) {
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
const updateShowLink = (artworks: PixivViewer.Artwork[]) => {
	if (artworks.length < 1) {
		showLink.href = '#';
		setElementInactive(showLink);
		return;
	}
	const url = new URL(link.href);
	url.search = btoa(JSON.stringify(artworks));
	showLink.href = url.href;
	setElementActive(showLink);
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
			updateShowLink(selection);
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

showLink.addEventListener('click', (event) => {
	event.preventDefault();

	storage.set({ isSelecting: false, selection: [] });
	chrome.tabs.update({ url: showLink.href });
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
	updateShowLink(selection);
});
