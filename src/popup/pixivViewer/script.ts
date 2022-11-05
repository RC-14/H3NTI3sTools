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

const getImageUrlsFromSelection = (selection: unknown[]) => {
	if (selection.length < 1) return [];

	const images: PixivViewer.Image[] = [];

	for (let i = 0; i < selection.length; i++) {
		const illustration = selection[i] as PixivViewer.Illustration;

		if (typeof illustration?.id !== 'number') continue;

		if (typeof illustration.pageCount === 'number' && illustration.pageCount > 1) {
			for (let j = 1; j <= illustration.pageCount; j++)
				images.push({ id: illustration.id, page: j });
		} else {
			images.push({ id: illustration.id });
		}
	}
	return images;
};

/*
 * UI update functions
 */
const updateShowLink = (images: PixivViewer.Image[]) => {
	if (images.length < 1) {
		showLink.href = '#';
		setElementInactive(showLink);
		return;
	}
	const url = new URL(link.href);
	url.search = btoa(JSON.stringify(images));
	showLink.href = url.href;
	setElementActive(showLink);
};

const updateSelectButton = (isSelecting: boolean) => {
	selectButton.innerText = isSelecting ? 'Stop' : 'Start';
	setElementActive(selectButton);
};

const updateClearButton = (images: PixivViewer.Image[]) => {
	if (images.length > 0) {
		setElementActive(clearButton);
		return;
	}
	setElementInactive(clearButton);
};

/*
 * Listener
 */
storage.addChangeListener((changes) => {
	if (changes.isSelecting !== undefined) {
		updateSelectButton(changes.isSelecting.newValue);
	}

	if (changes.selection !== undefined) {
		const selection: unknown = changes.selection.newValue;

		if (Array.isArray(selection)) {
			let images = getImageUrlsFromSelection(selection);

			updateShowLink(images);
			updateClearButton(images);
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
		storage.set({ selection: [] });
		return;
	}
	const images = getImageUrlsFromSelection(selection);

	updateClearButton(images);
	updateShowLink(images);
});
