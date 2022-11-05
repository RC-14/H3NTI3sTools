import { qs, useTemplate, showMessage } from '../../utils.js';
import { addListeners as addHideCursorListeners } from '../../hideCursor.js';

addHideCursorListeners();

const errorContainer = qs<HTMLDivElement>('div#error-container');
const imageContainer = qs<HTMLDivElement>('div#image-container');

if (!(errorContainer instanceof HTMLDivElement)) throw new Error("Error container isn't a DIV element");
if (!(imageContainer instanceof HTMLDivElement)) throw new Error("Image container isn't a DIV element");

const errorTitle = qs<HTMLParagraphElement>('p.error-title', errorContainer);
const errorDescription = qs<HTMLParagraphElement>('p.error-description', errorContainer);

if (!(errorTitle instanceof HTMLParagraphElement)) throw new Error("Error title isn't a DIV element");
if (!(errorDescription instanceof HTMLParagraphElement)) throw new Error("Error description isn't a DIV element");

const imageTemplate = qs<HTMLTemplateElement>('template#image-template');

if (!(imageTemplate instanceof HTMLTemplateElement)) throw new Error("Image template isn't a template element");

const showError = (title: string, description: string) => {
	imageContainer.classList.add('hidden');
	errorContainer.classList.remove('hidden');

	errorTitle.innerText = title;
	errorDescription.innerText = description;
};

const pixivArtworkInfoRequestMap = new Map<PixivViewer.Illustration['id'], Promise<PixivViewer.APIResponse>>();

// Request information about the illustration which contains urls to the image
const getPixivArtworkInfo = async (id: PixivViewer.Illustration['id']): Promise<PixivViewer.APIResponse> => {
	// Prevent sending multiple requests for the same id
	if (pixivArtworkInfoRequestMap.has(id)) return await pixivArtworkInfoRequestMap.get(id) as PixivViewer.APIResponse;

	const request = new Promise<PixivViewer.APIResponse>(async (resolve, reject) => {
		// Actually request the information
		const response = await fetch(`https://www.pixiv.net/ajax/illust/${id}?lang=en`);
		resolve(await response.json());
	});
	// Let other function calls find this request
	pixivArtworkInfoRequestMap.set(id, request);

	return await request;
};

const getPixivImageUrl = async (id: PixivViewer.Illustration['id'], page?: number) => {
	const info = await getPixivArtworkInfo(id);

	// If an error occured throw it - YEET
	if (info.error) throw new Error(`API call for ID "${id}" failed with message: ${info.message}`);

	// Check if we got a URL
	if (typeof info.body.urls !== 'object' || Array.isArray(info.body.urls) || info.body.urls === null) throw new Error(`API response for ID "${id}" didn't contain urls.`);
	if (typeof info.body.urls.original !== 'string') throw new Error(`API response for ID "${id}" didn't contain url for original.`);

	const url = new URL(info.body.urls.original);

	// Return the url if it doesn't need to be modified
	if (page === undefined || page === 1) return url;

	// Check if the requestet page esists
	if (typeof info.body.pageCount !== 'number') throw new Error(`API response for ID "${id}" didn't contain a page count.`);
	if (page > info.body.pageCount) throw new Error(`API response for ID "${id}" contained a lower page count (${info.body.pageCount}) than requested (${page}).`);

	// Adjust the URL if needed
	url.pathname = url.pathname.replace('_p0', `_p${page - 1}`);

	return url;
};

const counter = qs('#counter') as HTMLDivElement;
const imageUrlList: URL[] = [];
let imageIndex = -1;

const updateCounter = () => {
	counter.innerText = `${imageIndex + 1}/${imageUrlList.length}`;
};

const addImage = (srcUrl: URL, siteUrl?: URL) => {
	// Prevent loading images multiple times
	if (qs(`[data-src="${srcUrl.href}"]`, imageContainer) !== null) return;

	const wrapper = useTemplate(imageTemplate);

	if (!(wrapper instanceof HTMLDivElement)) throw new Error("Wrapper isn't a div element.");
	
	const imgElem = qs<HTMLImageElement>('img', wrapper);
	const aElem = qs<HTMLAnchorElement>('a', wrapper);

	if (!(imgElem instanceof HTMLImageElement)) throw new Error("Img elem isn't an image element.");
	if (!(aElem instanceof HTMLAnchorElement)) throw new Error("A elem isn't an anchor element.");

	imgElem.addEventListener('error', (event) => {
		if (!(event.target instanceof HTMLImageElement)) return;

		// Make the image invisable but still clickable if it fails to load
		event.target.style.opacity = '0';
	});

	imgElem.addEventListener('load', (event) => {
		if (!(event.target instanceof HTMLImageElement)) return;

		// If loading of the image previously failed and it gets reloaded make it visible again
		event.target.style.opacity = '';
	});

	// Try to accellerate loading of the first image
	if (imageContainer.childElementCount === 0) imgElem.setAttribute('fetchpriority', 'high');

	// Set URLs
	wrapper.dataset.src = imgElem.src = srcUrl.href;
	aElem.href = siteUrl?.href ?? srcUrl.href;

	imageContainer.append(wrapper);
};

const hideCurrentImage = () => {
	const wrapper = qs(`[data-src="${imageUrlList[imageIndex].href}"]`, imageContainer);
	if (wrapper === null) return;

	wrapper.classList.add('hidden');

	const imgElem = qs<HTMLImageElement>('img', wrapper);
	if (imgElem === null) return;

	imgElem.setAttribute('fetchpriority', 'low');
};

const showCurrentImage = () => {
	const wrapper = qs(`[data-src="${imageUrlList[imageIndex].href}"]`, imageContainer);
	if (wrapper === null) return;

	wrapper.classList.remove('hidden');

	const imgElem = qs<HTMLImageElement>('img', wrapper);
	if (imgElem === null) return;

	imgElem.setAttribute('fetchpriority', 'high');
};

// Show previous image
const previous = () => {
	hideCurrentImage();
	/*
	 * (
	 *	imageIndex
	 *  - 1
	 *  + imageUrlList.length	| Make sure we don't get a negative number when calculating modulo
	 * )
	 * % imageUrlList.length	| Make sure image index always stays in the valid range of numbers (0 <= imageIndex < imageUrlList.length)
	 */
	imageIndex = (imageIndex - 1 + imageUrlList.length) % imageUrlList.length;
	showCurrentImage();
	updateCounter();
};

// Show next image
const next = () => {
	hideCurrentImage();
	// Simpler version of the formula in previous() because we don't have to worry about negative numbers
	imageIndex = (imageIndex + 1) % imageUrlList.length;
	showCurrentImage();
	updateCounter();
};

const showImages = async () => {
	errorContainer.classList.add('hidden');
	imageContainer.classList.remove('hidden');
	counter.classList.remove('hidden');

	// Parse location.search
	const imageList: (string | PixivViewer.Image)[] = JSON.parse(atob(location.search.substring(1)));

	// Get the image URLs
	const imageSourcePromiseList: Promise<void>[] = [];

	showMessage('Getting the image URLs...');

	for (const image of imageList) {
		if (typeof image === 'string') {
			imageUrlList.push(new URL(image));
			continue;
		} else if (image.overwriteUrl !== undefined) {
			imageUrlList.push(new URL(image.overwriteUrl));
			continue;
		}

		const index = imageUrlList.length;
		imageUrlList.push(new URL(`pixiv://id=${image.id}` + (image.page === undefined ? '' : `&page=${image.page}`)));

		imageSourcePromiseList.push(new Promise(async (resolve, reject) => {
			imageUrlList[index] = await getPixivImageUrl(image.id, image.page);
			resolve();
		}));
	}

	// Wait for the Promises to resolve (or reject if an error occured)
	await Promise.allSettled(imageSourcePromiseList);
	showMessage('Got image URLs');

	// Add Image Elements
	showMessage('Start loading images...');
	for (let i = 0; i < imageList.length; i++) {
		if (typeof imageList[i] === 'string') {
			addImage(imageUrlList[i]);
			continue;
		}
		const siteUrl = new URL(`https://www.pixiv.net/en/artworks/${(imageList[i] as PixivViewer.Image).id}`);
		addImage(imageUrlList[i], siteUrl);
	}

	// Show first image
	imageIndex = 0;
	showCurrentImage();
	updateCounter();

	// Add controls
	document.addEventListener('keydown', (event) => {
		switch (event.code) {
			case 'ArrowLeft':
			case 'KeyA':
				previous();
				break;

			case 'ArrowRight':
			case 'KeyD':
				next();
				break;

			case 'Space':
				next();
				break;
		}
	});

	document.addEventListener('mouseup', (event) => {
		// Return if it's neither the back nor the forward button (usually at the side of the mouse)
		if (event.button < 3 || event.button > 4) return;

		event.preventDefault();

		switch (event.button) {
			case 3:
				previous();
				break;
				
			case 4:
				next();
				break;
		}
	});
};

if (location.search) {
	try {
		showImages();
	} catch (error) {
		showError('Error showing Images', `Error Message: ${error}`);
	}
} else {
	// Show error
	showError('Nothing to show', 'The search part of the URL is empty.');
}
