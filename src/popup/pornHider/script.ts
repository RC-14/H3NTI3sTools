import { tabs, windows, type Tabs } from 'webextension-polyfill';
import '/src/lib/devToolHelpers';
import { qs, qsa, useTemplate } from '/src/lib/utils';

const filterInput = qs<HTMLInputElement>('input[type="text"]#filter');
const hideAllButton = qs<HTMLButtonElement>('button#hide-all-button');
const toggleAllButton = qs<HTMLButtonElement>('button#toggle-all-button');
const showAllButton = qs<HTMLButtonElement>('button#show-all-button');
const tabListElement = qs<HTMLOListElement>('ol#tab-list');
const tabListEntryElementTemplate = qs<HTMLTemplateElement>('template#tab-list-entry-template');

if (!(
	filterInput &&
	hideAllButton &&
	toggleAllButton &&
	showAllButton &&
	tabListElement &&
	tabListEntryElementTemplate
)) throw new Error(`Didn't find an important element.`);

const getTabList = async (windowId: number) => {
	let tabList = await tabs.query({ windowId });
	tabList = tabList.sort((a, b) => a.index - b.index);
	return tabList.map((tab) => ({
		id: tab.id!,
		url: tab.url ?? '',
		title: tab.title?.trim() || tab.url || '',
		hidden: tab.hidden ?? false,
		ignore: tab.pinned || tab.active
	}));
};

const createTabListEntryElement = (id: number, url: string, title: string, hidden: boolean, ignore: boolean) => {
	const rootElement = useTemplate(tabListEntryElementTemplate);
	if (!(rootElement instanceof HTMLLIElement)) throw new Error(`Tab List Entry element corrupted: Incorrect root element.`);

	const titleElement = qs<HTMLParagraphElement>('p[name="title"]', rootElement);
	if (titleElement === null) throw new Error(`Tab List Entry element corrupted: Didn't find a title element.`);

	const urlElement = qs<HTMLParagraphElement>('p[name="url"]', rootElement);
	if (urlElement === null) throw new Error(`Tab List Entry element corrupted: Didn't find a url element.`);

	rootElement.setAttribute('name', `${id}`);
	if (ignore) rootElement.classList.add('ignore');
	if (hidden) rootElement.classList.add('hidden');

	if (title) titleElement.innerText = title;

	if (url) urlElement.innerText = url;

	return rootElement;
};

const addTabListEntryElementsToList = async (windowId: number) => {
	const tabList = await getTabList(windowId);

	for (const tab of tabList) {
		tabListElement.append(createTabListEntryElement(tab.id, tab.url, tab.title, tab.hidden, tab.ignore));
	}
};

const indexOfTabInList = (tabId: number) => {
	for (let i = 0; i < tabListElement.children.length; i++) {
		if (tabListElement.children[i]!.getAttribute('name') === `${tabId}`) return i;
	}
	return -1;
};

const tabUpdatedListener = (tabId: number, changeInfo: Tabs.OnUpdatedChangeInfoType) => {
	const index = indexOfTabInList(tabId);
	if (index === -1) throw new Error(`Could't update tab (${tabId}). Tab not present in tab list.`);

	const tabListEntry = qs<HTMLLIElement>(`& > li:nth-child(${index + 1})`, tabListElement);
	if (tabListEntry === null) throw new Error(`Couldn't find a Tab List Entry Element for the updated tab.`);

	const titleElement = qs<HTMLParagraphElement>(`p[name="title"]`, tabListEntry);
	if (titleElement === null) throw new Error(`Couldn't find a Title Element for the updated tab.`);

	const urlElement = qs<HTMLParagraphElement>('p[name="url"]', tabListEntry);
	if (urlElement === null) throw new Error(`Couldn't find a URL Element for the updated tab.`);

	if (changeInfo.title !== undefined) {
		if (changeInfo.title.trim()) {
			titleElement.innerText = changeInfo.title.trim();
		} else {
			titleElement.innerText = 'No Title';
		}
	}

	if (changeInfo.url !== undefined) {
		if (changeInfo.url.trim()) {
			urlElement.innerText = changeInfo.url.trim();
		} else {
			urlElement.innerText = 'No URL';
		}
	}

	if (changeInfo.hidden !== undefined) {
		if (changeInfo.hidden) {
			tabListEntry.classList.add('hidden');
		} else {
			tabListEntry.classList.remove('hidden');
		}
	}
};

const toggleVisibilityButtonsClickListener = (event: MouseEvent) => {
	if (event.target === null || !(event.target instanceof HTMLButtonElement)) return;

	const tabListEntryRootElement = event.target.parentElement?.parentElement;

	if (!(tabListEntryRootElement instanceof HTMLLIElement)) throw new Error(`Toggle Visibility Button Listener triggered for a button that should not exist.`);

	const tabId = parseInt(tabListEntryRootElement.getAttribute('name') ?? '');
	if (isNaN(tabId)) throw new Error(`Toggle Visibility Button Listener triggered for a Tab List Entry Element without a tab id as it's name.`);

	if (tabListEntryRootElement.classList.contains('hidden')) {
		tabs.show(tabId).catch((error) => {
			throw new Error(`Showing the tab failed with an error: ${error}`);
		});
	} else {
		tabs.hide(tabId).catch((error) => {
			throw new Error(`Hiding the tab failed with an error: ${error}`);
		});
	}
};

const hideAllButtonClickListener = () => {
	const tabElements = qsa<HTMLLIElement>('& > li:not(.hidden):not(.filtered):not(.ignore)', tabListElement);
	const tabIDs: number[] = [];

	for (const tabElement of tabElements) {
		const tabId = parseInt(tabElement.getAttribute('name') ?? '');
		if (isNaN(tabId)) throw new Error(`Tab List Entry element doesn't have a tabId set as the name.`);

		tabIDs.push(tabId);
	}

	tabs.hide(tabIDs).catch((error) => {
		throw new Error(`Hiding tabs failed with an error: ${error}`);
	});
};

const toggleAllButtonClickListener = () => {
	const hiddenTabElements = qsa<HTMLLIElement>('& > li.hidden:not(.filtered):not(.ignore)', tabListElement);
	const visibleTabElements = qsa<HTMLLIElement>('& > li:not(.hidden):not(.filtered):not(.ignore)', tabListElement);
	const hiddenTabIDs: number[] = [];
	const visibleTabIDs: number[] = [];

	for (const tabElement of hiddenTabElements) {
		const tabId = parseInt(tabElement.getAttribute('name') ?? '');
		if (isNaN(tabId)) throw new Error(`Tab List Entry element doesn't have a tabId set as the name.`);

		hiddenTabIDs.push(tabId);
	}

	for (const tabElement of visibleTabElements) {
		const tabId = parseInt(tabElement.getAttribute('name') ?? '');
		if (isNaN(tabId)) throw new Error(`Tab List Entry element doesn't have a tabId set as the name.`);

		visibleTabIDs.push(tabId);
	}

	tabs.show(hiddenTabIDs).catch((error) => {
		throw new Error(`Toggling hidden tabs failed with an error: ${error}`);
	});

	tabs.hide(hiddenTabIDs).catch((error) => {
		throw new Error(`Toggling visible tabs failed with an error: ${error}`);
	});
};

const showAllButtonClickListener = () => {
	const tabElements = qsa<HTMLLIElement>('& > li.hidden:not(.filtered):not(.ignore)', tabListElement);
	const tabIDs: number[] = [];

	for (const tabElement of tabElements) {
		const tabId = parseInt(tabElement.getAttribute('name') ?? '');
		if (isNaN(tabId)) throw new Error(`Tab List Entry element doesn't have a tabId set as the name.`);

		tabIDs.push(tabId);
	}

	tabs.show(tabIDs).catch((error) => {
		throw new Error(`Hiding tabs failed with an error: ${error}`);
	});
};

const filterInputInputListener = () => {
	const filter = filterInput.value.toLowerCase();

	const tabListEntries = qsa<HTMLLIElement>('& > li', tabListElement);

	for (const tabListEntry of tabListEntries) {
		if (filter === '') {
			tabListEntry.classList.remove('filtered');
			continue;
		}

		const titleElement = qs<HTMLParagraphElement>('p[name="title"]', tabListEntry);
		if (titleElement === null) throw new Error(`Couldn't get a title for tab list entry (id: ${tabListEntry.getAttribute('name')})`);

		if (titleElement.innerText.toLowerCase().includes(filter)) {
			tabListEntry.classList.remove('filtered');
			continue;
		}

		const urlElement = qs<HTMLParagraphElement>('p[name="url"]', tabListEntry);
		if (urlElement === null) throw new Error(`Couldn't get a url for tab list entry (id: ${tabListEntry.getAttribute('name')})`);

		if (urlElement.innerText.toLowerCase().includes(filter)) {
			tabListEntry.classList.remove('filtered');
			continue;
		}

		tabListEntry.classList.add('filtered');
	}
};

const init = async () => {
	const windowId = (await windows.getCurrent()).id;
	if (windowId === undefined || windowId === windows.WINDOW_ID_NONE) throw new Error(`Couldn't get the id of the current window.`);

	addTabListEntryElementsToList(windowId);

	tabs.onUpdated.addListener(tabUpdatedListener, { windowId, properties: ['hidden', 'title', 'url'] });

	tabListElement.addEventListener('click', toggleVisibilityButtonsClickListener, { passive: true });

	hideAllButton.addEventListener('click', hideAllButtonClickListener, { passive: true });
	toggleAllButton.addEventListener('click', toggleAllButtonClickListener, { passive: true });
	showAllButton.addEventListener('click', showAllButtonClickListener, { passive: true });

	filterInput.addEventListener('input', filterInputInputListener, { passive: true });
};

init().catch((error) => {
	throw new Error(error);
});
