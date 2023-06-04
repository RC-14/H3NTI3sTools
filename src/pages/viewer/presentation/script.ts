import { getMediaInfo, getUsableSrcForSource } from './cachedIDBUtils';
import { addHideCursorListeners } from '/src/lib/hideCursor';
import { hideElement, showElement } from '/src/lib/pageUtils';
import { qs, useTemplate } from '/src/lib/utils';
import { MEDIA_OS_NAME, Media, UrlSchema, getViewerIDB, mediaTypeHandlers } from '/src/lib/viewer';

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

const showError = (title: string, description: string) => {
	hideElement(presentationContainer);
	showElement(errorContainer);

	errorTitle.innerText = title;
	errorDescription.innerText = description;
};

const parseSearch = (): string[] => {
	return UrlSchema.array().parse(JSON.parse(atob(location.search.substring(1))));
};

const getInfoForAllMedia = async (): Promise<Media[]> => {
	const mediaOrigins = parseSearch();
	const mediaInfoPromises: Promise<Media | undefined>[] = [];

	for (const origin of mediaOrigins) {
		if (typeof origin !== 'string') continue;
		mediaInfoPromises.push(getMediaInfo(origin));
	}

	return (await Promise.all(mediaInfoPromises)).filter(Boolean);
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

const showMedia = (origin: string) => {
	const mediaContainer = getMediaContainer(origin);

	if (!(mediaContainer instanceof HTMLDivElement)) throw new Error("Couldn't find an element for the given media origin.");

	showElement(mediaContainer);
};

const hideMedia = (origin: string) => {
	const mediaContainer = getMediaContainer(origin);

	if (!(mediaContainer instanceof HTMLDivElement)) throw new Error("Couldn't find an element for the given media.");

	hideElement(mediaContainer);
};

const updateCounterElement = () => {
	mediaCounterElement.innerText = `${mediaCounter + 1}/${mediaList.length}`;
};

const showNextMedia = () => {
	if (mediaCounter !== -1) {
		const currentMedia = mediaList[mediaCounter];
		hideMedia(currentMedia.origin);

		mediaTypeHandlers[currentMedia.type].hideMedia(currentMedia, getContentContainerFromMediaContainer(getMediaContainer(currentMedia.origin)!)!, 'forward');
	}

	mediaCounter = (mediaCounter + 1) % mediaList.length;
	const nextMedia = mediaList[mediaCounter];

	mediaTypeHandlers[nextMedia.type].presentMedia(nextMedia, getContentContainerFromMediaContainer(getMediaContainer(nextMedia.origin)!)!, 'forward');

	showMedia(nextMedia.origin);
	updateCounterElement();
};

const showPreviousMedia = () => {
	if (mediaCounter !== -1) {
		const currentMedia = mediaList[mediaCounter];
		hideMedia(currentMedia.origin);

		mediaTypeHandlers[currentMedia.type].hideMedia(currentMedia, getContentContainerFromMediaContainer(getMediaContainer(currentMedia.origin)!)!, 'backward');
	} else {
		mediaCounter = 0;
	}

	mediaCounter = (mediaCounter + mediaList.length - 1) % mediaList.length;
	const nextMedia = mediaList[mediaCounter];

	mediaTypeHandlers[nextMedia.type].presentMedia(nextMedia, getContentContainerFromMediaContainer(getMediaContainer(nextMedia.origin)!)!, 'backward');

	showMedia(nextMedia.origin);
	updateCounterElement();
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

	mediaList.push(...await getInfoForAllMedia());

	const addMediaContainerToDomPromises: Promise<void>[] = [];

	// Add media containers to DOM
	for (const media of mediaList) {
		addMediaContainerToDomPromises.push(addMediaContainerToDOM(media));
	}

	// Wait for everything to be ready
	await Promise.all(addMediaContainerToDomPromises);

	// Show first media
	showNextMedia();

	showElement(mediaCounterElement);

	// Add controls
	addControls();
};

addHideCursorListeners();

if (location.search) {
	try {
		init();
	} catch (error) {
		showError('Error when trying to show Galleries', `${error}`);
	}
} else {
	showError('Nothing to show', 'The search part of the URL is empty.');
}
