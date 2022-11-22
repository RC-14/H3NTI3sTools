import { qs, qsa, sendRuntimeMessage, StorageHelper } from '../../utils.js';

const storage = new StorageHelper('session', 'pixivViewer');

const toolBox = document.createElement('div');
toolBox.id = 'h3nti3-tool-box';

const toggleSelectingButton = document.createElement('button');
toggleSelectingButton.id = 'h3nti3-toggle-button';
toolBox.append(toggleSelectingButton);

const openButton = document.createElement('button');
openButton.id = 'h3nti3-open-button';
toolBox.append(openButton);

const selectButton = document.createElement('button');
selectButton.id = 'h3nti3-select-button';
toolBox.append(selectButton);

document.documentElement.append(toolBox);

let isSelecting = await storage.get('isSelecting') as boolean;

/*
 * Helper functions
 */
const getCurrentIllustrationId = () => {
	const id: Pixiv.IllustrationInfo['illustId'] = parseInt(location.pathname.match(/^(?:\/\w{2})?\/artworks\/(\d+)/i)?.at(1) ?? 'NaN');

	if (isNaN(id)) return null;
	return id;
};

const getAllIllustrationElements = () => {
	const illustrationElements: HTMLElement[] = [];
	qsa<HTMLElement>('[type="illust"] a').forEach(element => {
		while (element.parentElement != null) {
			if (element.parentElement instanceof HTMLUListElement) break;

			element = element.parentElement;
		}
		if (element.parentElement !== null) illustrationElements.push(element);
	});
	return illustrationElements;
};

const getPixivIdFromIllustrationElement = (elem: HTMLElement): PixivViewer.PixivArtwork['pixivId'] => {
	const aElem = qs<HTMLAnchorElement>(`[type="illust"] a`, elem);
	const id = parseInt(aElem?.href.match(/\/artworks\/(\d+)/)?.[1] ?? 'NaN');

	if (isNaN(id)) throw new Error('[pixivViewer] Illustration ID not found');

	return id;
};

const isElementSelected = (element: HTMLElement) => element.classList.contains('pixivViewer-selected');

const selectElement = (element: HTMLElement) => element.classList.add('pixivViewer-selected');

const unselectElement = (element: HTMLElement) => element.classList.remove('pixivViewer-selected');

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

const toggle = (liElement: HTMLElement) => {
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

/*
 * Toolbox update functions
 */
const updateToggleSelectingButton = () => {
	if (isSelecting) {
		toggleSelectingButton.innerText = 'Stop Selecting';
	} else {
		toggleSelectingButton.innerText = 'Start Selecting';
	}
};

const updateOpenButton = async () => {
	if (isSelecting) {
		const selection = await storage.get('selection') as PixivViewer.Artwork[] | undefined;

		openButton.innerText = 'Show Selection';

		openButton.disabled = (selection?.length ?? 0) === 0;
		return;
	}

	if (getCurrentIllustrationId() !== null) {
		openButton.innerText = 'Show in PixivViewer';
		openButton.disabled = false;
		return;
	}

	openButton.innerText = '';
	openButton.disabled = false;
};

const updateSelectButton = () => {
	const illustId = getCurrentIllustrationId();

	if (illustId === null || !isSelecting) {
		selectButton.innerText = '';
		return;
	}

	if (toolBox.hasAttribute('data-selected')) {
		selectButton.innerText = 'Unselect';
	} else {
		selectButton.innerText = 'Select';
	}
};

const updateToolBox = async () => {
	const illustId = getCurrentIllustrationId();

	if (illustId !== null) {
		toolBox.dataset.illustId = illustId.toString();
		if (await isSelected(illustId)) {
			toolBox.dataset.selected = '';
		} else {
			delete toolBox.dataset.selected;
		}
	} else {
		delete toolBox.dataset.illustId;
		delete toolBox.dataset.selected;
	}

	if (isSelecting) {
		toolBox.dataset.selecting = '';
	} else {
		delete toolBox.dataset.selecting;
	}

	updateToggleSelectingButton();
	updateOpenButton();
	updateSelectButton();
};

/*
 * Listeners
 */
storage.addChangeListener((changes) => {
	if (changes.isSelecting !== undefined) {
		isSelecting = changes.isSelecting.newValue;
		updateToolBox();
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
		if (element.parentElement instanceof HTMLUListElement) break;

		element = element.parentElement;
	}
	if (element.parentElement == null) return;
	event.preventDefault();
	toggle(element);
}, { capture: true });

toggleSelectingButton.addEventListener('click', (event) => {
	storage.set('isSelecting', !isSelecting);
}, { passive: true });

interface test {
	x: string
	[key: number]: string
}

openButton.addEventListener('click', async (event) => {
	const messageData: PixivViewer.ShowMessageData = { tabId: null };
	const illustId = getCurrentIllustrationId();

	if (isSelecting) {
		const artworks = await storage.get('selection') as PixivViewer.Artwork[] | undefined;
		if ((artworks?.length ?? 0) === 0) return;

		sendRuntimeMessage('worker', 'pixivViewer', 'showSelection', messageData);
	} else if (illustId !== null) {
		messageData.artwork = { pixivId: illustId };
		sendRuntimeMessage('worker', 'pixivViewer', 'showArtwork', messageData);
	}
}, { passive: true });

selectButton.addEventListener('click', (event) => {
	const illustId = getCurrentIllustrationId();
	if (illustId === null) return;

	if (toolBox.hasAttribute('data-selected')) {
		unselect(illustId).then(updateToolBox);
	} else {
		select(illustId).then(updateToolBox);
	}
}, { passive: true });

document.addEventListener('readystatechange', () => {
	if (document.readyState !== 'complete') return;

	updateSelectedElements();

	updateToolBox();
});

addEventListener('historystateupdated', () => {
	updateSelectedElements();

	updateToolBox();
});
