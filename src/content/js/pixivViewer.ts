import { qs, qsa, StorageHelper } from '../../utils.js';

const storage = new StorageHelper('session', 'pixivViewer');

let isSelecting = await storage.get('isSelecting') as boolean;

/*
 * Helper functions
 */
const getAllIllustrationElements = () => {
	const illustrations: HTMLLIElement[] = [];
	qsa<HTMLElement>('[type="illust"] a').forEach(element => {
		while (element.parentElement != null) {
			if (
				element.parentElement instanceof HTMLUListElement &&
				element instanceof HTMLLIElement
			) break;

			element = element.parentElement;
		}
		if (element.parentElement !== null) illustrations.push(element as HTMLLIElement);
	});
	return illustrations;
};

const getDataFromIllustrationElement = (liElem: HTMLLIElement): PixivViewer.Illustration => {
	const aElem = qs<HTMLAnchorElement>(`[type="illust"] a`, liElem);
	const id = parseInt(aElem?.href.match(/\/artworks\/(\d+)/)?.[1] ?? 'NaN', 10);
	const pageCount = parseInt(aElem?.text.replace(/R-18G?/, '') ?? '1', 10);

	if (isNaN(id)) throw new Error('[pixivViewer] Illustration ID not found');
	return { id, pageCount };
};

const isElementSelected = (liElement: HTMLLIElement) => liElement.classList.contains('pixivViewer-selected');

const selectElement = (liElement: HTMLLIElement) => liElement.classList.add('pixivViewer-selected');

const unselectElement = (liElement: HTMLLIElement) => liElement.classList.remove('pixivViewer-selected');

const isSelected = async (illustration: PixivViewer.Illustration) => {
	let selection = await storage.get('selection') as PixivViewer.Illustration[];
	if (!Array.isArray(selection)) selection = [];

	for (let i = 0; i < selection.length; i++) {
		if (selection[i] == null) continue;
		if (typeof selection[i]?.id !== 'number') continue;

		if (selection[i].id === illustration.id) return true;
	}

	return false;
};

const select = async (illustration: PixivViewer.Illustration) => {
	getAllIllustrationElements().forEach((element) => {
		if (getDataFromIllustrationElement(element).id === illustration.id)
			selectElement(element);
	});
	if (await isSelected(illustration)) return;

	let selection = await storage.get('selection') as PixivViewer.Illustration[];
	if (!Array.isArray(selection)) selection = [];

	selection.push(illustration);
	storage.set({ selection });
};

const unselect = async (illustration: PixivViewer.Illustration) => {
	getAllIllustrationElements().forEach((element) => {
		if (getDataFromIllustrationElement(element).id === illustration.id)
			unselectElement(element);
	});
	let selection = await storage.get('selection') as PixivViewer.Illustration[];
	if (!Array.isArray(selection)) {
		storage.set({ selection: [] });
		return;
	}
	let didChange = false;

	for (let i = selection.length - 1; i >= 0; i--) {
		if (selection[i] == null) continue;
		if (typeof selection[i]?.id !== 'number') continue;

		if (selection[i].id === illustration.id) {
			selection.splice(i, 1);
			didChange = true;
		}
	}

	if (didChange) storage.set({ selection });
};

const toggle = (liElement: HTMLLIElement) => {
	const illustration = getDataFromIllustrationElement(liElement);

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

		if (await isSelected(getDataFromIllustrationElement(element))) {
			selectElement(element);
		} else {
			unselectElement(element);
		}
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

document.addEventListener('readystatechange', () => {
	if (document.readyState !== 'complete') return;

	updateSelectedElements();
	new MutationObserver(updateSelectedElements).observe(
		document,
		{ childList: true, subtree: true }
	);
});
