import { z } from 'zod';
import { getMediaInfo, getUsableSrcForSource } from './cachedIDBUtils';
import '/src/lib/devToolHelpers';
import { addHideCursorListeners } from '/src/lib/hideCursor';
import { preventSpaceBarScroll } from '/src/lib/noSpaceBarScroll';
import { hideElement, showElement } from '/src/lib/pageUtils';
import { isElementEditable, qs, qsa, sendRuntimeMessage, showMessage, useTemplate } from '/src/lib/utils';
import { CURRENT_MEDIA_SEARCH_PARAM, MEDIA_ORIGINS_SEARCH_PARAM, MEDIA_OS_NAME, PROGRESS_SEARCH_PARAM, UrlSchema, getViewerIDB, mediaTypeHandlers, type AddKeybindFunction, type KeybindHandler, type Media, type PresentationNavigationDirection, type RemoveKeybindFunction } from '/src/lib/viewer';

// TODO: Split up in multiple files

/* TODO
 * Don't add any elements to the DOM until they are needed,
 * while still adding them to the download queue if necessary,
 * to prevent tab crashes.
 * Aim: Only ~5 media actually present in the DOM. (Maybe 11 or 21 if necessary for quickly searching through the media.)
 */

const TOOLBOX_MENU_LIST_ID = 'toolbox-menu-list';

const presentationContainer = qs<HTMLDivElement>('div#presentation-container');
const mediaCounterElement = qs<HTMLParagraphElement>('p#media-counter');
const mediaContainerTemplate = qs<HTMLTemplateElement>('template#media-container-template');

const toolboxWrapper = qs<HTMLDivElement>('div#toolbox-wrapper');
const toolboxIcon = qs<HTMLLabelElement>('#toolbox-icon');
const toolboxMenuSelector = qs<HTMLSelectElement>('select#toolbox-menu-selector');
const toolboxMenuList = qs<HTMLUListElement>(`ul#${TOOLBOX_MENU_LIST_ID}`);

const autoProgressMenu = qs<HTMLLIElement>('li#autoProgress-menu');
const autoProgressToggleButton = qs<HTMLButtonElement>('button#autoProgress-toggle-button');
const autoProgressDelayInput = qs<HTMLInputElement>('input#autoProgress-delay-input');
const autoProgressApplyDelayButton = qs<HTMLButtonElement>('button#autoProgress-delay-apply-button');

const editPresentationMenu = qs<HTMLLIElement>('li#editPresentation-menu');
const editPresentationOriginInput = qs<HTMLInputElement>('input#editPresentation-origin-input');
const editPresentationAddButton = qs<HTMLButtonElement>('button#editPresentation-add-button');
const editPresentationAddFromClipboardButton = qs<HTMLButtonElement>('button#editPresentation-add-from-clipboard-button');
const editPresentationList = qs<HTMLOListElement>('ol#editPresentation-list');
const editPresentationResetButton = qs<HTMLButtonElement>('button#editPresentation-reset-button');
const editPresentationApplyButton = qs<HTMLButtonElement>('button#editPresentation-apply-button');
const editPresentationListItemTemplate = qs<HTMLTemplateElement>('template#editPresentation-list-item-template');

const errorContainer = qs<HTMLDivElement>('div#error-container');
const errorTitle = qs<HTMLParagraphElement>('p#error-title');
const errorDescription = qs<HTMLParagraphElement>('p#error-description');

if (!(
	presentationContainer &&
	mediaCounterElement &&
	mediaContainerTemplate &&
	toolboxWrapper &&
	toolboxIcon &&
	toolboxMenuSelector &&
	toolboxMenuList &&
	autoProgressMenu &&
	autoProgressToggleButton &&
	autoProgressDelayInput &&
	autoProgressApplyDelayButton &&
	editPresentationMenu &&
	editPresentationOriginInput &&
	editPresentationAddButton &&
	editPresentationAddFromClipboardButton &&
	editPresentationList &&
	editPresentationResetButton &&
	editPresentationApplyButton &&
	editPresentationListItemTemplate &&
	errorContainer &&
	errorTitle &&
	errorDescription
)) throw new Error("An essential element couldn't be found.");

const ToolboxMenuIdSchema = z.string().regex(/[a-zA-Z0-9]*/, { message: 'Invalid toolbox menu ID' });

const mediaList: Media[] = [];
const keybindMap: Map<string, KeybindHandler[]> = new Map();
let controlsEnabled = false;
let mediaCounter = -1;
let progress: number | undefined = undefined;
let ignorePopState = false;
let autoProgressDirection: PresentationNavigationDirection = 'forward';
let autoProgressTimeoutDelay = -1;
let autoProgressTimeoutId = -1;
let autoProgressActive = false;

const showError = (title: string, description: string) => {
	hideElement(presentationContainer);
	showElement(errorContainer);

	errorTitle.innerText = title;
	errorDescription.innerText = description;
};

const parseSearch = () => {
	const { searchParams } = new URL(location.href);

	if (!searchParams.has(MEDIA_ORIGINS_SEARCH_PARAM)) throw new Error(`Search doesn't contain a media list.`);
	const mediaOrigins = UrlSchema.array().parse(JSON.parse(atob(searchParams.get(MEDIA_ORIGINS_SEARCH_PARAM)!)));

	const currentMedia = parseInt(searchParams.get(CURRENT_MEDIA_SEARCH_PARAM) ?? '0');
	const parsedCurrentMedia = z.number().nonnegative().max(mediaOrigins.length).safeParse(currentMedia);

	const progress = Number(searchParams.get(PROGRESS_SEARCH_PARAM));
	const parsedProgress = z.number().safeParse(progress);

	return {
		mediaOrigins,
		currentMedia: parsedCurrentMedia.success ? parsedCurrentMedia.data : 0,
		progress: parsedProgress.success ? parsedProgress.data : undefined
	};
};

const getInfoForAllMedia = async (mediaOrigins: string[]): Promise<Media[]> => {
	const mediaInfoPromises: Promise<Media>[] = [];

	for (const origin of mediaOrigins) {
		if (typeof origin !== 'string') continue;
		mediaInfoPromises.push(getMediaInfo(origin));
	}

	const settledPromises = await Promise.allSettled(mediaInfoPromises);

	const results: PromiseFulfilledResult<Media>[] = [];

	for (const promise of settledPromises) {
		if (promise.status === 'fulfilled') {
			results.push(promise);
			continue;
		}

		console.warn(promise.reason);
	}

	return results.map((result) => result.value);
};

const getMediaContainer = (origin: string) => qs<HTMLDivElement>(`div.media-container[data-origin="${UrlSchema.parse(origin)}"]`);
const getContentContainerFromMediaContainer = (mediaContainer: HTMLDivElement) => qs<HTMLDivElement>('div.content-container', mediaContainer);
const getFavoriteButtonFromMediaContainer = (mediaContainer: HTMLDivElement) => qs<HTMLButtonElement>('button.favorite-button', mediaContainer);
const getNameElementFromMediaContainer = (mediaContainer: HTMLDivElement) => qs<HTMLParagraphElement>('p.media-name', mediaContainer);
const getOriginLinkElementFromMediaContainer = (mediaContainer: HTMLDivElement) => qs<HTMLAnchorElement>('a.origin-link', mediaContainer);
const getCreatorListFromMediaContainer = (mediaContainer: HTMLDivElement) => qs<HTMLUListElement>('ul.creator-list', mediaContainer);

const addMediaContainerToDOM = async (media: Media) => {
	if (getMediaContainer(media.origin) !== null) return;

	const mediaContainer = useTemplate(mediaContainerTemplate) as HTMLDivElement;
	mediaContainer.dataset.origin = media.origin;
	mediaContainer.dataset.type = media.type;

	const favoriteButton = getFavoriteButtonFromMediaContainer(mediaContainer)!;
	mediaContainer.dataset.favorite = `${media.favorite}`;
	favoriteButton.addEventListener('click', async (event) => {
		media.favorite = !media.favorite;

		mediaContainer.dataset.favorite = `${media.favorite}`;

		const db = await getViewerIDB();
		const transaction = db.transaction(MEDIA_OS_NAME, 'readwrite');
		const request = transaction.objectStore(MEDIA_OS_NAME).put(media);

		request.addEventListener('error', (errorEvent) => {
			db.close();

			media.favorite = !media.favorite;
			mediaContainer.dataset.favorite = `${media.favorite}`;

			throw new Error(`Failed to write "${media.name}" (${media.origin}): ${request.error}`);
		});
		request.addEventListener('success', (successEvent) => {
			db.close();
		});

		transaction.commit();
	});

	const nameElement = getNameElementFromMediaContainer(mediaContainer)!;
	nameElement.innerText = media.name;

	const originLinkElement = getOriginLinkElementFromMediaContainer(mediaContainer)!;
	if (typeof media.origin === 'string') {
		originLinkElement.href = media.origin;
	} else {
		originLinkElement.remove();
	}

	const creatorListElement = getCreatorListFromMediaContainer(mediaContainer)!;
	if (media.creatorNames.length > 0) {
		for (const creatorName of media.creatorNames) {
			const creatorListEntry = document.createElement('li');
			creatorListEntry.innerText = creatorName;
			creatorListElement.append(creatorListEntry);
		}
	} else {
		creatorListElement.remove();
	}

	const contentContainer = getContentContainerFromMediaContainer(mediaContainer)!;
	const handler = mediaTypeHandlers[media.type];
	if (handler === undefined) throw new Error(`No handler found for media type: ${media.type}`);

	await handler.addContentToContentContainer(media, contentContainer, getUsableSrcForSource);

	presentationContainer.append(mediaContainer);
};

const preload = (index: number, direction: PresentationNavigationDirection) => {
	const media = mediaList[index]!;
	const mediaContainer = getMediaContainer(media.origin)!;
	const contentContainer = getContentContainerFromMediaContainer(mediaContainer)!;

	const handler = mediaTypeHandlers[media.type];
	if (handler === undefined) throw new Error(`No handler found for media type: ${media.type}`);

	handler.preload(media, contentContainer, direction);
};

const popstateHandler = (event: PopStateEvent) => {
	if (ignorePopState) {
		ignorePopState = false;
		return;
	}

	const { mediaOrigins, currentMedia, progress } = parseSearch();

	if (!(mediaOrigins.length === mediaList.length && mediaOrigins.every((origin, i) => origin === mediaList[i]!.origin))) {
		location.reload();
		return;
	}

	showMedia(currentMedia, 'forward');
};

const updateUrl = () => {
	const url = new URL(location.href);

	url.searchParams.set(CURRENT_MEDIA_SEARCH_PARAM, `${mediaCounter}`);

	if (progress !== undefined) {
		url.searchParams.set(PROGRESS_SEARCH_PARAM, `${progress}`);
	} else if (url.searchParams.has(PROGRESS_SEARCH_PARAM)) {
		url.searchParams.delete(PROGRESS_SEARCH_PARAM);
	}

	if (url.href === location.href) return;

	ignorePopState = true;
	history.replaceState(undefined, '', url);
};

const updateTitle = () => {
	document.title = `${document.title.split(' | ')[0]!} | ${mediaList[mediaCounter]!.origin}`;
};

const setProgress = (newProgress?: number) => {
	progress = newProgress;

	updateUrl();
};

const getKeybindId = (key: string, shift?: boolean, ctrl?: boolean, fallback?: boolean) => `${key};${shift ?? false};${ctrl ?? false};${fallback ?? false}`;

const addKeybind = (trigger: string | { key: string, shift?: boolean, ctrl?: boolean, fallback?: boolean; }, func: KeybindHandler) => {
	if (typeof trigger === 'string') trigger = { key: trigger };

	const keybindId = getKeybindId(trigger.key, trigger.shift, trigger.ctrl, trigger.fallback);

	if (!keybindMap.has(keybindId)) keybindMap.set(keybindId, []);

	const funcArray = keybindMap.get(keybindId)!;
	funcArray.push(func);
};
const addKeybindNoFallback: AddKeybindFunction = (trigger, func) => {
	if (typeof trigger === 'string') {
		addKeybind(trigger, func);
		return;
	}
	addKeybind({ ...trigger, fallback: false }, func);
};

const removeKeybind = (trigger: string | { key: string, shift?: boolean, ctrl?: boolean, fallback?: boolean; }, func: KeybindHandler) => {
	if (typeof trigger === 'string') trigger = { key: trigger };

	const keybindId = getKeybindId(trigger.key, trigger.shift, trigger.ctrl, trigger.fallback);

	if (!keybindMap.has(keybindId)) return;

	const funcArray = keybindMap.get(keybindId)!;
	for (let i = funcArray.length - 1; i >= 0; i--) {
		if (func === funcArray[i]) funcArray.splice(i, 1);
	}
};
const removeKeybindNoFallback: RemoveKeybindFunction = (trigger, func) => {
	if (typeof trigger === 'string') {
		removeKeybind(trigger, func);
		return;
	}
	removeKeybind({ ...trigger, fallback: false }, func);
};

const showMediaContainer = (media: Media, direction: PresentationNavigationDirection = 'forward', progress?: number) => {
	const mediaContainer = getMediaContainer(media.origin);

	if (!(mediaContainer instanceof HTMLDivElement)) throw new Error("Couldn't find an element for the given media origin.");

	showElement(mediaContainer);


	const handler = mediaTypeHandlers[media.type];
	if (handler === undefined) throw new Error(`No handler found for media type: ${media.type}`);

	handler.presentMedia(media, getContentContainerFromMediaContainer(mediaContainer)!, direction, addKeybindNoFallback, setProgress, progress);
};

const hideMediaContainer = (media: Media, direction: PresentationNavigationDirection = 'forward') => {
	const mediaContainer = getMediaContainer(media.origin);
	if (!(mediaContainer instanceof HTMLDivElement)) throw new Error("Couldn't find an element for the given media.");


	const handler = mediaTypeHandlers[media.type];
	if (handler === undefined) throw new Error(`No handler found for media type: ${media.type}`);

	handler.hideMedia(media, getContentContainerFromMediaContainer(mediaContainer)!, direction, removeKeybindNoFallback);

	hideElement(mediaContainer);
};

const updateCounterElement = () => {
	mediaCounterElement.innerText = `${mediaCounter + 1}/${mediaList.length}`;
};

const showMedia = (index: number, direction: PresentationNavigationDirection = 'forward', progress?: number) => {
	if (index < 0 || index >= mediaList.length) throw new Error(`Index out of range (0, ${mediaList.length - 1}): ${index}`);

	// Hide the previous media if necessary
	if (mediaCounter !== -1) {
		const lastMedia = mediaList[mediaCounter]!;
		hideMediaContainer(lastMedia, direction);

		presentationContainer.parentElement!.scrollTo({ top: 0, behavior: 'instant' });

		progress = undefined;
	}

	mediaCounter = index;
	updateCounterElement();
	updateUrl();
	updateTitle();

	const media = mediaList[mediaCounter]!;
	showMediaContainer(media, direction, progress);

	// Preload the media that could be shown next
	preload((mediaCounter + 1) % mediaList.length, direction === 'forward' ? 'forward' : 'backward');
	preload((mediaCounter + mediaList.length - 1) % mediaList.length, direction === 'forward' ? 'backward' : 'forward');
};

const showNextMedia = () => {
	if (mediaList.length === 1) return;
	showMedia((mediaCounter + 1) % mediaList.length, 'forward');
};

const showPreviousMedia = () => {
	if (mediaList.length === 1) return;
	showMedia((mediaCounter + mediaList.length - 1) % mediaList.length, 'backward');
};

const applyAutoProgressSettings = () => {
	if (!autoProgressDelayInput.validity.valid) return;

	autoProgressTimeoutDelay = autoProgressDelayInput.valueAsNumber * 1_000;
};

const autoProgressSetDelayKeybind = (newDelay: number) => {
	if (newDelay >= 0) {
		autoProgressTimeoutDelay = newDelay;
	} else {
		autoProgressTimeoutDelay = 0;
	}

	autoProgressDelayInput.value = `${autoProgressTimeoutDelay / 1000}`;

	showMessage(`Auto Progress delay set to ${autoProgressDelayInput.valueAsNumber} sec.`);
};

const autoProgressTimeoutHandler = async () => {
	const currentMedia = mediaList[mediaCounter]!;
	const currentMediaContentContainer = getContentContainerFromMediaContainer(getMediaContainer(currentMedia.origin)!)!;

	const handler = mediaTypeHandlers[currentMedia.type];
	if (handler === undefined) throw new Error(`No handler found for media type: ${currentMedia.type}`);

	const handlerReponse = handler.autoProgressHandler(currentMedia, currentMediaContentContainer, autoProgressDirection);

	if (handlerReponse !== false) {
		if (handlerReponse !== true) await handlerReponse;

		if (autoProgressDirection === 'forward') {
			showNextMedia();
		} else {
			showPreviousMedia();
		}
	}

	autoProgressTimeoutId = setTimeout(autoProgressTimeoutHandler, autoProgressTimeoutDelay);
};

const startAutoProgress = (notify = false) => {
	if (autoProgressActive) return;

	autoProgressTimeoutId = setTimeout(autoProgressTimeoutHandler, autoProgressTimeoutDelay);

	autoProgressToggleButton.innerText = 'Stop';

	autoProgressActive = true;

	if (notify) showMessage('Auto Progress started');
};

const stopAutoProgress = (notify = false) => {
	if (!autoProgressActive) return;

	clearInterval(autoProgressTimeoutId);
	autoProgressTimeoutId = -1;

	autoProgressToggleButton.innerText = 'Start';

	autoProgressActive = false;

	if (notify) showMessage('Auto Progress stopped');
};

const toggleAutoProgress = (notify = false) => {
	if (autoProgressActive) {
		stopAutoProgress(notify);
		return;
	}

	applyAutoProgressSettings();
	startAutoProgress(notify);
};

const restartAutoProgress = () => {
	if (!autoProgressActive) return;

	stopAutoProgress();
	startAutoProgress();
};

const addAutoProgressFunctionality = () => {
	autoProgressToggleButton.addEventListener('click', () => toggleAutoProgress(), { passive: true });

	autoProgressApplyDelayButton.addEventListener('click', applyAutoProgressSettings, { passive: true });

	applyAutoProgressSettings();
};

const addEditPresentationListEntry = (url: string, insertAtStart = false) => {
	const listEntry = useTemplate(editPresentationListItemTemplate);
	if (!(listEntry instanceof HTMLLIElement)) throw new Error(`The editPresentation list item template is corrupted.`);

	const textElement = qs<HTMLParagraphElement>('p', listEntry);
	if (!textElement) throw new Error("Couldn't find a p element inside the editPresentation list entry.");

	textElement.innerText = url;

	if (insertAtStart) {
		editPresentationList.prepend(listEntry);
	} else {
		editPresentationList.append(listEntry);
	}
};

const editPresentationResetList = () => {
	for (let i = editPresentationList.childElementCount - 1; i >= 0; i--) {
		editPresentationList.children[i]?.remove();
	}

	const { mediaOrigins } = parseSearch();

	for (const origin of mediaOrigins) {
		addEditPresentationListEntry(origin);
	}

	editPresentationList.firstElementChild?.scrollIntoView({ behavior: 'instant' });
};

const editPresentationAddButtonClickListener = (event: MouseEvent) => {
	if (!editPresentationOriginInput.validity.valid || editPresentationOriginInput.value.trim() === '') return;

	const insertAtStart = event.shiftKey;

	addEditPresentationListEntry(editPresentationOriginInput.value.trim(), insertAtStart);
	editPresentationOriginInput.value = '';

	if (insertAtStart) {
		editPresentationList.firstElementChild?.scrollIntoView({ behavior: 'instant' });
	} else {
		editPresentationList.lastElementChild?.scrollIntoView({ behavior: 'instant' });
	}
};

const editPresentationAddFromClipboardButtonClickListener = async (event: MouseEvent) => {
	const rawText = await navigator.clipboard.readText();
	const splitText = rawText.split('\n');

	const newEntryList: string[] = [];
	for (const line of splitText) {
		newEntryList.unshift(line.trim());
		if (newEntryList[0]!.length === 0) continue;

		if (!URL.canParse(newEntryList[0]!)) {
			console.warn('Got invalid data from clipboard.');
			return;
		}
	}

	const insertAtStart = event.shiftKey;

	if (!insertAtStart) newEntryList.reverse();

	for (const entry of newEntryList) {
		addEditPresentationListEntry(entry, insertAtStart);
	}

	if (insertAtStart) {
		editPresentationList.firstElementChild?.scrollIntoView({ behavior: 'instant' });
	} else {
		editPresentationList.lastElementChild?.scrollIntoView({ behavior: 'instant' });
	}
};

const editPresentationOriginInputKeydownListener = (event: KeyboardEvent) => {
	if (event.code === 'Enter') editPresentationAddButton.dispatchEvent(new MouseEvent('click', { shiftKey: event.shiftKey }));
};

const editPresentationListRemoveButtonClickListener = (event: MouseEvent) => {
	if (event.target instanceof HTMLButtonElement) {
		// '!' is my easy way of getting an error thrown in case something went wrong.
		event.target.parentElement!.parentElement!.parentElement!.remove();
	}
};

const editPresentationListItemDragStartEndListener = (event: DragEvent) => {
	if (event.target instanceof HTMLLIElement) {
		event.target.classList.toggle('dragging');
	}
};

const editPresentationListDragoverListener = (event: DragEvent) => {
	const dragging = qs<HTMLLIElement>('li.dragging', editPresentationList);
	if (!dragging) throw new Error("Couldn't find an element being dragged.");

	event.preventDefault();

	const listItems = qsa<HTMLLIElement>('&>li', editPresentationList);
	const afterElement: { offset: number, element?: (typeof listItems)[number]; } = { offset: Number.NEGATIVE_INFINITY };

	for (const listItem of listItems) {
		const box = listItem.getBoundingClientRect();
		const offset = event.clientY - box.top - box.height / 2;

		if (offset >= 0 || offset < afterElement.offset) continue;

		afterElement.element = listItem;
		afterElement.offset = offset;
	}

	if (afterElement.element) {
		editPresentationList.insertBefore(dragging, afterElement.element);
	} else {
		editPresentationList.append(dragging);
	}
};

const editPresentationApplyButtonClickListener = () => {
	const textElements = qsa<HTMLParagraphElement>('p', editPresentationList);
	const origins = [...textElements].map((element) => element.innerText);
	location.search = `m=${btoa(JSON.stringify(origins))}`;
};

const addEditPresentationFunctionality = () => {
	editPresentationResetList();

	editPresentationAddButton.addEventListener('click', editPresentationAddButtonClickListener, { passive: true });
	editPresentationAddFromClipboardButton.addEventListener('click', editPresentationAddFromClipboardButtonClickListener, { passive: true });
	editPresentationOriginInput.addEventListener('keydown', editPresentationOriginInputKeydownListener, { passive: true });
	editPresentationList.addEventListener('click', editPresentationListRemoveButtonClickListener, { passive: true });
	editPresentationList.addEventListener('dragstart', editPresentationListItemDragStartEndListener, { passive: true });
	editPresentationList.addEventListener('dragend', editPresentationListItemDragStartEndListener, { passive: true });
	editPresentationList.addEventListener('dragover', editPresentationListDragoverListener);
	editPresentationResetButton.addEventListener('click', editPresentationResetList, { passive: true });
	editPresentationApplyButton.addEventListener('click', editPresentationApplyButtonClickListener, { passive: true });
};

const getToolboxMenu = (id: string) => {
	const parsedId = ToolboxMenuIdSchema.parse(id);

	const menu = qs<HTMLLIElement>(`#${TOOLBOX_MENU_LIST_ID} > .toolbox-menu[name="${parsedId}"]`);

	if (menu === null) throw new Error(`No toolbox menu found for id: ${parsedId}`);

	return menu;
};

const addToolboxFunctionality = () => {
	addAutoProgressFunctionality();
	addEditPresentationFunctionality();

	toolboxMenuSelector.addEventListener('change', (event) => {
		const previousMenu = qs(`#${TOOLBOX_MENU_LIST_ID} > .selected`);
		previousMenu?.classList.remove('selected');

		const newMenuName = ToolboxMenuIdSchema.parse(toolboxMenuSelector.value);
		const newMenu = getToolboxMenu(newMenuName);
		newMenu.classList.add('selected');
	});

	toolboxIcon.addEventListener('click', (event) => toolboxWrapper.classList.toggle('open'), { passive: true });

	const defaultMenuName = ToolboxMenuIdSchema.parse(toolboxMenuSelector.value);
	const defaultMenu = getToolboxMenu(defaultMenuName);
	defaultMenu.classList.add('selected');

	showElement(toolboxWrapper);
};

const addControls = () => {
	// Add keybinds
	addKeybind({ key: 'ArrowLeft', fallback: true }, showPreviousMedia);
	addKeybind('ArrowLeft', restartAutoProgress);

	addKeybind({ key: 'ArrowRight', fallback: true }, showNextMedia);
	addKeybind('ArrowRight', restartAutoProgress);

	addKeybind({ key: 'Space', fallback: true }, showNextMedia);
	addKeybind('Space', restartAutoProgress);

	addKeybind({ key: 'Space', shift: true, fallback: true }, showPreviousMedia);
	addKeybind({ key: 'Space', shift: true }, restartAutoProgress);

	addKeybind({ key: 'ArrowDown', ctrl: true, fallback: true }, () => autoProgressSetDelayKeybind(autoProgressTimeoutDelay - 1000));
	addKeybind({ key: 'ArrowUp', ctrl: true, fallback: true }, () => autoProgressSetDelayKeybind(autoProgressTimeoutDelay + 1000));

	addKeybind({ key: 'Space', ctrl: true, fallback: true }, () => toggleAutoProgress(true));

	// Add keybind event listener
	document.addEventListener('keydown', (event) => {
		if (!controlsEnabled || event.target instanceof HTMLElement && isElementEditable(event.target)) return;

		const keybindId = getKeybindId(event.code, event.shiftKey, event.ctrlKey, event.altKey);

		const currentMedia = mediaList[mediaCounter]!;
		const currentMediaContentContainer = getContentContainerFromMediaContainer(getMediaContainer(currentMedia.origin)!)!;

		let continueProcessing = true;

		if (keybindMap.has(keybindId)) {
			event.preventDefault();

			const funcArray = keybindMap.get(keybindId)!;

			for (const func of funcArray) {
				continueProcessing = func(currentMedia, currentMediaContentContainer, event) ?? true;
				if (!continueProcessing) break;
			}
		}

		if (event.altKey || !continueProcessing) return;

		// Process fallback keybinds
		const fallbackKeybindId = getKeybindId(event.code, event.shiftKey, event.ctrlKey, true);

		if (!keybindMap.has(fallbackKeybindId)) return;

		event.preventDefault();

		const fallbackFuncArray = keybindMap.get(fallbackKeybindId)!;

		continueProcessing = true;

		for (const fallbackFunc of fallbackFuncArray) {
			continueProcessing = fallbackFunc(currentMedia, currentMediaContentContainer, event) ?? true;
			if (!continueProcessing) break;
		}
	});
};

const init = async () => {
	hideElement(errorContainer);
	showElement(presentationContainer);

	const { mediaOrigins, currentMedia, progress } = parseSearch();

	if (mediaOrigins.length === 0) {
		showError('Nothing to show', 'The search part of the URL contains an empty array.');
		return;
	}

	mediaList.push(...await getInfoForAllMedia(mediaOrigins));

	if (mediaList.length === 0) {
		showError('Nothing to show', `The search part of the URL contains no valid origins.\n${JSON.stringify(mediaOrigins)}`);
		return;
	}

	const addMediaContainerToDomPromises: Promise<void>[] = [];

	// Add media containers to DOM
	for (const media of mediaList) {
		addMediaContainerToDomPromises.push(addMediaContainerToDOM(media));
	}

	// Wait for everything to be ready
	await Promise.all(addMediaContainerToDomPromises);

	// Add the popstate listener
	window.addEventListener('popstate', popstateHandler);

	addToolboxFunctionality();

	// Add controls
	addControls();

	// Show the media counter
	showElement(mediaCounterElement);

	// Show first media
	showMedia(currentMedia, 'forward', progress);

	controlsEnabled = true;

	sendRuntimeMessage('background', 'historyRecorder', 'recordExtensionPage');
};

preventSpaceBarScroll();
addHideCursorListeners();

history.scrollRestoration = 'manual';

if (location.search) {
	init().catch((error) => {
		showError('Error when trying to show Media', `${error}`);
		throw error;
	});
} else {
	showError('Nothing to show', 'The search part of the URL is empty.');
}
