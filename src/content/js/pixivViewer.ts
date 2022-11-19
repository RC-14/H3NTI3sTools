import { qs, qsa, StorageHelper } from '../../utils.js';

const storage = new StorageHelper('session', 'pixivViewer');

const selectButton = document.createElement('button');
selectButton.id = 'h3nti3-selectButton';
document.documentElement.append(selectButton);

let isSelecting = await storage.get('isSelecting') as boolean;

/*
 * Helper functions
 */
const getAllIllustrationElements = () => {
	const illustrationElements: HTMLLIElement[] = [];
	qsa<HTMLElement>('[type="illust"] a').forEach(element => {
		while (element.parentElement != null) {
			if (
				element.parentElement instanceof HTMLUListElement &&
				element instanceof HTMLLIElement
			) break;

			element = element.parentElement;
		}
		if (element.parentElement !== null) illustrationElements.push(element as HTMLLIElement);
	});
	return illustrationElements;
};

const getPixivIdFromIllustrationElement = (liElem: HTMLLIElement): PixivViewer.PixivArtwork['pixivId'] => {
	const aElem = qs<HTMLAnchorElement>(`[type="illust"] a`, liElem);
	const id = parseInt(aElem?.href.match(/\/artworks\/(\d+)/)?.[1] ?? 'NaN');

	if (isNaN(id)) throw new Error('[pixivViewer] Illustration ID not found');

	return id;
};

const isElementSelected = (liElement: HTMLLIElement) => liElement.classList.contains('pixivViewer-selected');

const selectElement = (liElement: HTMLLIElement) => liElement.classList.add('pixivViewer-selected');

const unselectElement = (liElement: HTMLLIElement) => liElement.classList.remove('pixivViewer-selected');

const isSelected = async (pixivId: PixivViewer.PixivArtwork['pixivId']) => {
	let selection = await storage.get('selection') as PixivViewer.Artwork[];
	if (!Array.isArray(selection)) selection = [];

	for (const selected of selection) {
		if (typeof selected === 'string') continue;
		if (selected.pixivId === pixivId) return true;
	}
	return false;
};

const select = async (pixivId: PixivViewer.PixivArtwork['pixivId']) => {
	getAllIllustrationElements().forEach((element) => {
		if (getPixivIdFromIllustrationElement(element) === pixivId) selectElement(element);
	});
	if (await isSelected(pixivId)) return;

	let selection = await storage.get('selection') as PixivViewer.Artwork[];
	if (!Array.isArray(selection)) selection = [];

	selection.push({ pixivId });
	storage.set({ selection });
};

const unselect = async (pixivId: PixivViewer.PixivArtwork['pixivId']) => {
	getAllIllustrationElements().forEach((element) => {
		if (getPixivIdFromIllustrationElement(element) === pixivId) unselectElement(element);
	});
	let selection = await storage.get('selection') as PixivViewer.Artwork[];
	if (!Array.isArray(selection)) {
		storage.set({ selection: [] });
		return;
	}
	let didChange = false;

	for (let i = selection.length - 1; i >= 0; i--) {
		const entry = selection[i];
		if (typeof entry === 'string') continue;

		if (entry.pixivId === pixivId) {
			selection.splice(i, 1);
			didChange = true;
		}
	}

	if (didChange) storage.set({ selection });
};

const toggle = (liElement: HTMLLIElement) => {
	const illustration = getPixivIdFromIllustrationElement(liElement);

	if (isElementSelected(liElement)) {
		unselect(illustration);
	} else {
		select(illustration);
	}
};

const updateSelectedElements = async () => {
	const elements = getAllIllustrationElements();

	for (let i = 0; i < elements.length; i++) {
		const element = elements[i];

		if (await isSelected(getPixivIdFromIllustrationElement(element))) {
			selectElement(element);
		} else {
			unselectElement(element);
		}
	}
};

const updateSelectButton = async () => {
	const illustId = parseInt(location.pathname.match(/^(?:\/\w{2})?\/artworks\/(\d+)/i)?.at(1) ?? 'NaN');

	if (isNaN(illustId)) {
		delete selectButton.dataset.illustId;
		delete selectButton.dataset.selected;
		selectButton.innerText = '';
		return;
	}

	selectButton.dataset.illustId = illustId.toString();

	if (await isSelected(illustId)) {
		selectButton.dataset.selected = '';
		selectButton.innerText = 'Unselect';
	} else {
		delete selectButton.dataset.selected;
		selectButton.innerText = 'Select';
	}
};

/*
 * Listeners
 */
storage.addChangeListener((changes) => {
	if (changes.isSelecting !== undefined) {
		isSelecting = changes.isSelecting.newValue;
	}

	if (changes.selection !== undefined) {
		updateSelectedElements();
	}
});

// Handle clicks on illustration elements
document.addEventListener('click', (event) => {
	if (!isSelecting) return;

	if (!(event.target instanceof HTMLElement)) return;
	let element = event.target;

	while (element.parentElement != null) {
		if (
			element.parentElement instanceof HTMLUListElement &&
			element instanceof HTMLLIElement
		) break;

		element = element.parentElement;
	}
	if (element.parentElement == null) return;
	event.preventDefault();
	toggle(element as HTMLLIElement);
}, { capture: true });

selectButton.addEventListener('click', (event) => {
	console.log('test', event);
	if (selectButton.dataset.illustId === undefined) return;

	const illustId = parseInt(selectButton.dataset.illustId);

	if (selectButton.hasAttribute('data-selected')) {
		unselect(illustId).then(updateSelectButton);
	} else {
		select(illustId).then(updateSelectButton);
	}
}, { passive: true });

document.addEventListener('readystatechange', () => {
	if (document.readyState !== 'complete') return;

	updateSelectedElements();
	updateSelectButton();
});

addEventListener('historystateupdated', () => {
	updateSelectedElements();
	updateSelectButton();
});
