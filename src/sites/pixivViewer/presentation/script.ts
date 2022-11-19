import { qs, useTemplate, showMessage, generateIDBGetter } from '../../../utils.js';
import { addListeners as addHideCursorListeners } from '../../../hideCursor.js';
import { fetchIllustrationInfo as fetchIllustrationInfoFromAPI } from '../../../pixivAPI.js';

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

const getIDB = generateIDBGetter('pixivViewer', 1, (event) => {
	if (!(event.target instanceof IDBOpenDBRequest)) throw new Error('Event target is not an IDBOpenDBRequest.');
	if (!(event.target.result instanceof IDBDatabase)) throw new Error("Couldn't get access to the Database");
	const db = event.target.result;

	const illustrationInfoOS = db.createObjectStore('IllustrationInfo', { keyPath: 'illustId' });
	illustrationInfoOS.createIndex('tags', 'tags', { unique: false, multiEntry: true });
	illustrationInfoOS.createIndex('userId', 'userId', { unique: false });

	const userInfoOS = db.createObjectStore('UserInfo', { keyPath: 'userId' });
	userInfoOS.createIndex('userName', 'userName', { unique: false });

	const base64ImagesOS = db.createObjectStore('Base64Images', { keyPath: 'sourceUrl' });
	base64ImagesOS.createIndex('date', 'date', { unique: false });
});

const pixivIllustrationInfoRequestMap = new Map<Pixiv.IllustrationInfo['illustId'], Promise<Pixiv.IllustrationInfo>>();

const getPixivIllustrationInfo = async (id: Pixiv.IllustrationInfo['illustId'], db: IDBDatabase): Promise<Pixiv.IllustrationInfo> => {
	// Prevent sending multiple requests for the same id
	if (pixivIllustrationInfoRequestMap.has(id)) return await pixivIllustrationInfoRequestMap.get(id) as Pixiv.IllustrationInfo;

	const promise = new Promise<Pixiv.IllustrationInfo>(async (resolve, reject) => {
		// Fall back to an api request in case we don't get the illustration info from indexedDB
		const fallback = async () => {
			const illustInfo = await fetchIllustrationInfoFromAPI(id);

			const request = db.transaction('IllustrationInfo', 'readwrite').objectStore('IllustrationInfo').put(illustInfo);
			request.addEventListener('error', (event) => {
				console.error(`Failed to write illustration info to indexedDB with error: ${request.error}`);
			});

			resolve(illustInfo);
		};

		// Try to get the illustration info from indexedDB
		const request = db.transaction('IllustrationInfo', 'readonly').objectStore('IllustrationInfo').get(id);
		request.addEventListener('error', (event) => {
			console.error(`Failed to get illustration info from indexedDB with error: ${request.error}`);
			fallback();
		});
		request.addEventListener('success', (event) => {
			if (request.result === undefined) {
				fallback();
				return;
			}

			resolve(request.result);
		});
	});

	// Let other function calls find this promise
	pixivIllustrationInfoRequestMap.set(id, promise);

	return await promise;
};

const counter = qs('#counter') as HTMLDivElement;
const imageUrlList: URL[] = [];
let imageIndex = -1;

const updateCounter = () => {
	counter.innerText = `${imageIndex + 1}/${imageUrlList.length}`;
};

const addImage = (srcUrl: URL, siteUrl?: URL) => {
	imageUrlList.push(srcUrl);

	// Prevent loading images multiple times
	if (qs(`[data-src="${srcUrl.href}"]`, imageContainer) !== null) return;

	const wrapper = useTemplate(imageTemplate);

	if (!(wrapper instanceof HTMLDivElement)) throw new Error("Wrapper isn't a div element.");

	const imgElem = qs<HTMLImageElement>('img', wrapper);
	const aElem = qs<HTMLAnchorElement>('a', wrapper);

	if (!(imgElem instanceof HTMLImageElement)) throw new Error("Img elem isn't an image element.");
	if (!(aElem instanceof HTMLAnchorElement)) throw new Error("A elem isn't an anchor element.");

	// Set URLs
	wrapper.dataset.src = srcUrl.href;
	aElem.href = siteUrl?.href ?? srcUrl.href;

	// Try to load image from indexedDB
	getIDB().then((db) => {
		// Fallback in case we don't get the image from indexedDB
		const fallback = () => {
			fetch(srcUrl).then((response) => response.blob()).then((blob) => {
				const fileReader = new FileReader();
				fileReader.addEventListener('error', (event) => console.error(`Failed to get data URL for URL "${srcUrl}" with error: ${fileReader.error}`));
				fileReader.addEventListener('load', async (event) => {
					if (typeof fileReader.result !== 'string') {
						console.error(`Failed to get a data URL for URL "${srcUrl}": result is of type "${typeof fileReader.result}"`);
						return;
					}
					imgElem.src = fileReader.result;

					const entry: PixivViewer.Base64Image = {
						sourceUrl: srcUrl.href,
						b64Data: fileReader.result,
						date: Date.now()
					};

					const transaction = db.transaction('Base64Images', 'readwrite');
					const objectStore = transaction.objectStore('Base64Images');
					const request = objectStore.put(entry);

					request.addEventListener('error', (event) => {
						console.error(`Failed to write data URL for URL "${srcUrl}" to indexedDB with error: ${request.error}`);
						db.close();
					});
					request.addEventListener('success', (event) => db.close());
				});
				fileReader.readAsDataURL(blob);
			});
		};

		const transaction = db.transaction('Base64Images', 'readonly');
		const objectStore = transaction.objectStore('Base64Images');
		const request: IDBRequest<PixivViewer.Base64Image> = objectStore.get(srcUrl.href);

		request.addEventListener('error', (event) => {
			console.error(`Failed to get data URL for URL "${srcUrl}" from indexedDB with error: ${request.error}`);
			fallback();
		});
		request.addEventListener('success', (event) => {
			if (request.result === undefined) {
				fallback();
				return;
			}

			imgElem.src = request.result.b64Data;
		});
	});

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

	const db = await getIDB();

	// Parse location.search
	const artworkList: PixivViewer.Artwork[] = JSON.parse(atob(location.search.substring(1)));

	showMessage('Getting the image URLs...');
	const ArtworkPromiseList: Promise<{ site?: URL; urls: URL[]; }>[] = [];

	// Get the source URLs
	for (const artwork of artworkList) {
		ArtworkPromiseList.push(new Promise(async (resolve, reject) => {
			// Handle non pixiv images
			if (typeof artwork === 'string') {
				resolve({ urls: [new URL(artwork)] });
				return;
			}

			const illustInfo = await getPixivIllustrationInfo(artwork.pixivId, db);
			const urls: URL[] = [];

			// If there are overwrites set write them to indexedDB otherwise use the overwrites that are present (if there are any)
			if (!artwork.ignoreOverwrite && artwork.overwrite?.length) {
				const pageCount = illustInfo.pages.length > artwork.overwrite.length ? illustInfo.pages.length : artwork.overwrite.length;

				for (let i = 0; i < pageCount; i++) {
					// Need to use 'as' because otherwise typescript doesn't recognize that page might be undefined
					const page = illustInfo.pages[i] as Pixiv.IllustrationInfo['pages'][number] | undefined;

					// If there are old overwrites delete them to avoid messing stuff up
					if (page?.overwrite?.length) db.transaction('Base64Images', 'readwrite').objectStore('Base64Images').delete(page.overwrite as string).addEventListener('error', (event) => {
						console.error(`Failed to delete base64 image for url "${page.overwrite}" from indexedDB with error: ${(event.target as IDBRequest<undefined>).error}`);
					});

					if (artwork.overwrite[i]?.length) {
						urls.push(new URL(artwork.overwrite[i] as string));

						if (illustInfo.pages[i] === undefined) illustInfo.pages[i] = { thumb: '', original: '' };
						illustInfo.pages[i].overwrite = artwork.overwrite[i] as string;
					} else if (page?.original.length) {
						urls.push(new URL(page.original));

						delete illustInfo.pages[i].overwrite;
					}
				}

				db.transaction('IllustrationInfo', 'readwrite').objectStore('IllustrationInfo').put(illustInfo).addEventListener('error', (event) => {
					console.error(`Failed to write illustration info for id "${illustInfo.illustId}" to indexedDB with error: ${(event.target as IDBRequest<IDBValidKey>).error}`);
				});
			} else {
				for (let i = 0; i < illustInfo.pages.length; i++) {
					const page = illustInfo.pages[i];

					if (!artwork.ignoreOverwrite && page.overwrite?.length) {
						urls.push(new URL(page.overwrite));
					} else if (page.original.length) {
						urls.push(new URL(page.original));
					}
				}
			}

			resolve({
				site: new URL(`https://www.pixiv.net/en/artworks/${illustInfo.illustId}`),
				urls
			});
		}));
	}

	// Wait for the Promises to resolve (or reject if an error occured) and the images beeing added to the list
	await Promise.allSettled(ArtworkPromiseList).then((results) => {
		db.close();

		showMessage('Start loading images...');

		results.forEach((result) => {
			if (result.status === 'rejected') return;

			for (const url of result.value.urls) addImage(url, result.value.site);
		});
	});

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
