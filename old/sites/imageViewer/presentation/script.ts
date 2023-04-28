import { qs, useTemplate } from '../../../utils.js';
import { addListeners as addHideCursorListeners } from '../../../hideCursor.js';
import { getIndexedDB } from '../../../imageViewerUtils.js';

const presentationContainer = qs<HTMLDivElement>('div#presentation-container');
const galleryCounterElement = qs<HTMLParagraphElement>('p#gallery-counter');
const galleryTemplate = qs<HTMLTemplateElement>('div#gallery-template');

const errorContainer = qs<HTMLDivElement>('div#error-container');
const errorTitle = qs<HTMLParagraphElement>('p#error-title');
const errorDescription = qs<HTMLParagraphElement>('p#error-description');

if (!(
	presentationContainer instanceof HTMLDivElement &&
	galleryCounterElement instanceof HTMLParagraphElement &&
	galleryTemplate instanceof HTMLTemplateElement &&
	errorContainer instanceof HTMLDivElement &&
	errorTitle instanceof HTMLParagraphElement &&
	errorDescription instanceof HTMLParagraphElement
)) throw new Error("An essential element couldn't be found.");

const imageMap = new Map<string, string>();
const galleryMap = new Map<string, ImageViewer.Gallery>();
const authorMap = new Map<string, ImageViewer.Author>();

const galleries: ImageViewer.Gallery[] = [];
let galleryCounter = -1;
let pageCounter = -1;

const showError = (title: string, description: string) => {
	presentationContainer.classList.add('hidden');
	errorContainer.classList.remove('hidden');

	errorTitle.innerText = title;
	errorDescription.innerText = description;
};

const getImage = (source: string) => new Promise<string | undefined>(async (resolve, reject) => {
	if (imageMap.has(source)) {
		resolve(imageMap.get(source));
		return;
	}

	const db = await getIndexedDB();
	const authorOS = db.transaction('Images', 'readonly').objectStore('Images');

	const request = authorOS.get(source);

	request.addEventListener('success', () => {
		imageMap.set(source, request.result);
		resolve(request.result);
	});
	request.addEventListener('error', () => reject(request.error));
});

const getGallery = (uuid: ImageViewer.Gallery['uuid']) => new Promise<ImageViewer.Gallery | undefined>(async (resolve, reject) => {
	if (galleryMap.has(uuid)) {
		resolve(galleryMap.get(uuid));
		return;
	}

	const db = await getIndexedDB();
	const galleriesOS = db.transaction('Galleries', 'readonly').objectStore('Galleries');

	const request = galleriesOS.get(uuid);

	request.addEventListener('success', () => {
		galleryMap.set(uuid, request.result);
		resolve(request.result);
	});
	request.addEventListener('error', () => reject(request.error));
});

const getAuthor = (uuid: ImageViewer.Author['uuid']) => new Promise<ImageViewer.Author | undefined>(async (resolve, reject) => {
	if (authorMap.has(uuid)) {
		resolve(authorMap.get(uuid));
		return;
	}

	const db = await getIndexedDB();
	const authorOS = db.transaction('Authors', 'readonly').objectStore('Authors');

	const request = authorOS.get(uuid);

	request.addEventListener('success', () => {
		authorMap.set(uuid, request.result);
		resolve(request.result);
	});
	request.addEventListener('error', () => reject(request.error));
});

const getGalleries = async (): Promise<ImageViewer.Gallery[]> => {
	const uuids = JSON.parse(decodeURIComponent(location.search.substring(1))) as jsonValue;

	if (!Array.isArray(uuids)) throw new Error('Malformed search. Expected an array but got ' + typeof uuids + '.');

	const galleryPromises: Promise<ImageViewer.Gallery | undefined>[] = [];

	for (const uuid of uuids) {
		if (typeof uuid !== 'string') continue;
		galleryPromises.push(getGallery(uuid));
	}

	return (await Promise.all(galleryPromises)).filter(Boolean);
};

const addSrcToImg = async (imgElement: HTMLImageElement) => {
	const source = imgElement.dataset.source;

	if (typeof source !== 'string' || source.length === 0) throw new Error('Img element has no Source to retrieve the Image for.');

	const src = await getImage(source);

	if (src === undefined) throw new Error("Couldn't get an Image for the Source specified on the img element.");

	imgElement.src = src;
};

const addInfoToAuthorContainer = async (container: HTMLDivElement) => {
	const uuid = container.dataset.uuid;

	if (typeof uuid !== 'string' || uuid.length === 0) throw new Error('The container has no UUID to retrieve the Author for.');

	const author = await getAuthor(uuid);

	if (author === undefined) throw new Error("Couldn't get an Author for the UUID specified on the container.");

	const avatar = qs<HTMLImageElement>('img.class', container);
	const authorName = qs<HTMLParagraphElement>('p.author-name');

	if (!(
		avatar instanceof HTMLImageElement &&
		authorName instanceof HTMLParagraphElement
	)) throw new Error("Author container doesn't contain the necessary elements.");

	if (typeof author.avatar === 'string') {
		avatar.dataset.source = author.avatar;
		addSrcToImg(avatar);
	}

	authorName.innerText = author.name;
};

const addGalleryToDOM = async (gallery: ImageViewer.Gallery) => {
	if (qs(`div.gallery[data-uuid="${gallery.uuid}"]`) !== null) return;

	const galleryElement = useTemplate(galleryTemplate) as HTMLDivElement;
	const imgContainer = qs<HTMLDivElement>('div.img-container', galleryElement)!;
	const galleryNameElement = qs<HTMLParagraphElement>('p.gallery-name', galleryElement)!;
	const authorContainer = qs<HTMLDivElement>('div.author-container', galleryElement)!;

	galleryElement.dataset.uuid = gallery.uuid;
	galleryElement.classList.add(gallery.type);

	galleryNameElement.innerText = gallery.name;

	for (const source of gallery.sources) {
		const imgElement = document.createElement('img');

		imgElement.dataset.source = source;
		imgElement.decoding = 'sync';

		if (gallery.type === 'paged') imgElement.classList.add('hidden');

		addSrcToImg(imgElement);

		imgContainer.append(imgElement);
	}

	if (typeof gallery.authorUuid === 'string') {
		authorContainer.dataset.uuid = gallery.authorUuid;
		addInfoToAuthorContainer(authorContainer);
	} else {
		authorContainer.remove();
	}

	presentationContainer.append(galleryElement);
};

const showGallery = (uuid: ImageViewer.Gallery['uuid']) => {
	const galleryElement = qs<HTMLDivElement>(`div.gallery[data-uuid="${uuid}"]`);

	if (!(galleryElement instanceof HTMLDivElement)) throw new Error("Couldn't find an element for the given UUID.");

	galleryElement.classList.remove('hidden');
};

const hideGallery = (uuid: ImageViewer.Gallery['uuid']) => {
	const galleryElement = qs<HTMLDivElement>(`div.gallery[data-uuid="${uuid}"]`);

	if (!(galleryElement instanceof HTMLDivElement)) throw new Error("Couldn't find an element for the given UUID.");

	galleryElement.classList.add('hidden');
};

const showPage = (page: number) => {
};

const hidePage = (page: number) => {
};

const showNext = () => {
	if (galleryCounter === -1) galleryCounter = 0;

	const currentGallery = galleries[galleryCounter];

	if (pageCounter === -1) pageCounter = 0;

	if (currentGallery.type === 'paged') {
		hidePage(pageCounter);
	}

	hideGallery(currentGallery.uuid);

	galleryCounter = (galleryCounter + 1) % galleries.length;
	const nextGallery = galleries[galleryCounter];

	showGallery(nextGallery.uuid);

	if (nextGallery.type === 'paged') {
	}
};

const showPrevious = () => { };

const addControls = () => {
	document.addEventListener('keydown', (event) => {
		switch (event.code) {
			case 'ArrowLeft':
				showPrevious();
				break;

			case 'ArrowRight':
				showNext();
				break;

			case 'Space':
				if (event.shiftKey) {
					showPrevious();
				} else {
					showNext();
				}
				break;
		}
	});

	document.addEventListener('mouseup', (event) => {
		// Return if it's neither the back nor the forward button (usually at the side of the mouse)
		if (event.button < 3 || event.button > 4) return;

		event.preventDefault();

		switch (event.button) {
			case 3:
				showPrevious();
				break;

			case 4:
				showNext();
				break;
		}
	});
};

const showGalleries = async () => {
	galleries.push(...await getGalleries());

	const galleryInDomPromises: Promise<void>[] = [];

	// Add galleries to DOM (presentation should only read the b64 from iDB -> images should be loaded by worker -> communication necessary)
	for (const gallery of galleries) {
		galleryInDomPromises.push(addGalleryToDOM(gallery));
	}

	await Promise.all(galleryInDomPromises);

	// Add controls
	addControls();
};

addHideCursorListeners();

if (location.search) {
	try {
		showGalleries();
	} catch (error) {
		showError('Error when trying to show Galleries', `${error}`);
	}
} else {
	// Show error
	showError('Nothing to show', 'The search part of the URL is empty.');
}
