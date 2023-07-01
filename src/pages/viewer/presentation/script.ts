import { z } from 'zod';
import { getMediaInfo, getUsableSrcForSource } from './cachedIDBUtils';
import { addHideCursorListeners } from '/src/lib/hideCursor';
import { preventSpaceBarScroll } from '/src/lib/noSpaceBarScroll';
import { hideElement, showElement } from '/src/lib/pageUtils';
import { qs, useTemplate } from '/src/lib/utils';
import { CURRENT_MEDIA_SEARCH_PARAM, MEDIA_ORIGINS_SEARCH_PARAM, MEDIA_OS_NAME, Media, PROGRESS_SEARCH_PARAM, PresentationNavigationDirection, UrlSchema, getViewerIDB, mediaTypeHandlers } from '/src/lib/viewer';

const presentationContainer = qs<HTMLDivElement>('div#presentation-container');
const mediaCounterElement = qs<HTMLParagraphElement>('p#media-counter');
const mediaContainerTemplate = qs<HTMLTemplateElement>('template#media-container-template');

const errorContainer = qs<HTMLDivElement>('div#error-container');
const errorTitle = qs<HTMLParagraphElement>('p#error-title');
const errorDescription = qs<HTMLParagraphElement>('p#error-description');

if (!(
	presentationContainer instanceof HTMLDivElement &&
	mediaCounterElement instanceof HTMLParagraphElement &&
	mediaContainerTemplate instanceof HTMLTemplateElement &&
	errorContainer instanceof HTMLDivElement &&
	errorTitle instanceof HTMLParagraphElement &&
	errorDescription instanceof HTMLParagraphElement
)) throw new Error("An essential element couldn't be found.");

const mediaList: Media[] = [];
let mediaCounter = -1;
let progress: number | undefined = undefined;
let lastProgressSet: number = 0;
let ignorePopState = false;

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

	const results = settledPromises.filter((result) => result.status === 'fulfilled') as PromiseFulfilledResult<Media>[];

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
	await mediaTypeHandlers[media.type].addContentToContentContainer(media, contentContainer, getUsableSrcForSource);

	presentationContainer.append(mediaContainer);
};

const preload = (index: number, direction: PresentationNavigationDirection) => {
	const media = mediaList[index];
	const mediaContainer = getMediaContainer(media.origin)!;
	const contentContainer = getContentContainerFromMediaContainer(mediaContainer)!;

	mediaTypeHandlers[media.type].preload(media, contentContainer, direction);
};

const popstateHandler = (event: PopStateEvent) => {
	if (ignorePopState) {
		ignorePopState = false;
		return;
	}

	const { mediaOrigins, currentMedia, progress } = parseSearch();

	if (!(mediaOrigins.length === mediaList.length && mediaOrigins.every((origin, i) => origin === mediaList[i].origin))) {
		location.reload();
		return;
	}

	showMedia(currentMedia, 'forward');
};

const updateUrl = () => {
	const url = new URL(location.href);

	url.searchParams.set(CURRENT_MEDIA_SEARCH_PARAM, `${mediaCounter}`);

	if (progress !== undefined) url.searchParams.set(PROGRESS_SEARCH_PARAM, `${progress}`);

	if (url.href === location.href) return;

	ignorePopState = true;
	history.pushState(undefined, '', url);
};

const setProgress = (newProgress?: number) => {
	// Prevent calling history.pushtate() to often
	if (lastProgressSet + 1_000 > Date.now()) return;
	lastProgressSet = Date.now();

	progress = newProgress;

	updateUrl();
};

const showMediaContainer = (media: Media, direction: PresentationNavigationDirection = 'forward', progress?: number) => {
	const mediaContainer = getMediaContainer(media.origin);

	if (!(mediaContainer instanceof HTMLDivElement)) throw new Error("Couldn't find an element for the given media origin.");

	showElement(mediaContainer);

	mediaTypeHandlers[media.type].presentMedia(media, getContentContainerFromMediaContainer(mediaContainer)!, direction, setProgress, progress);
};

const hideMediaContainer = (media: Media, direction: PresentationNavigationDirection = 'forward') => {
	const mediaContainer = getMediaContainer(media.origin);
	if (!(mediaContainer instanceof HTMLDivElement)) throw new Error("Couldn't find an element for the given media.");

	mediaTypeHandlers[media.type].hideMedia(media, getContentContainerFromMediaContainer(mediaContainer)!, direction);

	hideElement(mediaContainer);
};

const updateCounterElement = () => {
	mediaCounterElement.innerText = `${mediaCounter + 1}/${mediaList.length}`;
};

const showMedia = (index: number, direction: PresentationNavigationDirection = 'forward', progress?: number) => {
	if (index < 0 || index >= mediaList.length) throw new Error(`Index out of range (0, ${mediaList.length - 1}): ${index}`);

	// Hide the previous media if necessary
	if (mediaCounter !== -1) {
		const lastMedia = mediaList[mediaCounter];
		hideMediaContainer(lastMedia, direction);

		progress = undefined;
	}

	mediaCounter = index;
	updateCounterElement();
	updateUrl();

	const media = mediaList[mediaCounter];
	showMediaContainer(media, direction, progress);

	// Preload the media that could be shown next
	preload((mediaCounter + 1) % mediaList.length, direction === 'forward' ? 'forward' : 'backward');
	preload((mediaCounter + mediaList.length - 1) % mediaList.length, direction === 'forward' ? 'backward' : 'forward');
};

const showNextMedia = () => {
	showMedia((mediaCounter + 1) % mediaList.length, 'forward');
};

const showPreviousMedia = () => {
	showMedia((mediaCounter + mediaList.length - 1) % mediaList.length, 'backward');
};

const addControls = () => {
	document.addEventListener('keydown', (event) => {
		let doDefault = true;

		const currentMedia = mediaList[mediaCounter];
		const currentMediaContentContainer = getContentContainerFromMediaContainer(getMediaContainer(currentMedia.origin)!)!;

		if (!event.altKey) doDefault = mediaTypeHandlers[currentMedia.type].presentationControlHandler(currentMedia, currentMediaContentContainer, event);

		if (doDefault) switch (event.code) {
			case 'ArrowLeft':
				showPreviousMedia();
				break;

			case 'ArrowRight':
				showNextMedia();
				break;

			case 'Space':
				if (event.shiftKey) {
					showPreviousMedia();
				} else {
					showNextMedia();
				}
				break;
		}
	});
};

const init = async () => {
	hideElement(errorContainer);
	showElement(presentationContainer);

	const { mediaOrigins, currentMedia, progress } = parseSearch();

	mediaList.push(...await getInfoForAllMedia(mediaOrigins));

	if (mediaList.length === 0) {
		showError('Nothing to show', 'The search part of the URL contains an empty array.');
		return;
	}

	const addMediaContainerToDomPromises: Promise<void>[] = [];

	// Add media containers to DOM
	for (const media of mediaList) {
		addMediaContainerToDomPromises.push(addMediaContainerToDOM(media));
	}

	// Wait for everything to be ready
	await Promise.all(addMediaContainerToDomPromises);

	// Show first media
	showMedia(currentMedia, 'forward', progress);

	// Show the media counter
	showElement(mediaCounterElement);

	// Add the popstate listener
	window.addEventListener('popstate', popstateHandler);

	// Add controls
	addControls();
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
