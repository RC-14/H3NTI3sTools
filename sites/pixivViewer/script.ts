import { qs, generateIDBGetter, useTemplate } from '../../utils.js';
import { addListeners as addHideCursorListeners } from '../../hideCursor.js';

addHideCursorListeners();

const WEEK_IN_MS = 1000 * 60 * 60 * 24 * 7;

const illustrationElementTemplate = qs('template#illustration-template');

if (!(illustrationElementTemplate instanceof HTMLTemplateElement)) throw new Error('Illustration template is not an HTML Template element.');

const getIDB = generateIDBGetter('pixivViewer', 2, async (event) => {
	if (!(event.target instanceof IDBOpenDBRequest)) throw new Error('Event target is not an IDBOpenDBRequest.');
	if (!(event.target.result instanceof IDBDatabase)) throw new Error("Couldn't get access to the Database.");
	if (!(event.target.transaction instanceof IDBTransaction)) throw new Error("Couldn't get access to the Transaction.");

	const db = event.target.result;
	const transaction = event.target.transaction;

	let illustrationInfoOS: IDBObjectStore;
	let userInfoOS: IDBObjectStore;
	let base64ImagesOS: IDBObjectStore;

	if (event.oldVersion < 1) {
		illustrationInfoOS = db.createObjectStore('IllustrationInfo', { keyPath: 'illustId' });
		illustrationInfoOS.createIndex('tags', 'tags', { unique: false, multiEntry: true });
		illustrationInfoOS.createIndex('userId', 'userId', { unique: false });

		userInfoOS = db.createObjectStore('UserInfo', { keyPath: 'userId' });
		userInfoOS.createIndex('userName', 'userName', { unique: false });

		base64ImagesOS = db.createObjectStore('Base64Images', { keyPath: 'sourceUrl' });
		base64ImagesOS.createIndex('date', 'date', { unique: false });
	} else {
		illustrationInfoOS = transaction.objectStore('IllustrationInfo');
		userInfoOS = transaction.objectStore('UserInfo');
		base64ImagesOS = transaction.objectStore('Base64Images');
	}

	if (event.oldVersion < 2) {
		await new Promise<void>((resolve, reject) => {
			const cursorRequest = base64ImagesOS.openCursor();

			cursorRequest.addEventListener('error', (event) => reject(cursorRequest.error));
			cursorRequest.addEventListener('success', (event) => {
				const cursor = cursorRequest.result;

				if (!(cursor instanceof IDBCursor)) {
					resolve();
					return;
				}
				const entry: PixivViewer.Base64Image = cursor.value;
				entry.expiryDate = entry.date + WEEK_IN_MS;
				cursor.update(entry);

				cursor.continue();
			});

		});
		base64ImagesOS.createIndex('expiryDate', 'expiryDate');
	}
});

const addIllustrationElements = () => new Promise<void>(async (resolve, reject) => {
	const idb = await getIDB();

	const request = idb.transaction('IllustrationInfo', 'readonly').objectStore('IllustrationInfo').openCursor();

	request.addEventListener('error', (event) => {
		throw new Error(`Getting the cursor failed with an error: ${request.error}`);
	});
	request.addEventListener('success', (event) => {
		// Resolve if all illustrations are added as elements
		if (request.result === null) {
			resolve();
			return;
		}

		const cursor = request.result;
		const illustInfo: Pixiv.IllustrationInfo = cursor.value;

		const illustElem = useTemplate(illustrationElementTemplate);
		if (!(illustElem instanceof HTMLDivElement)) throw new Error("Didn't get a div from illustration template.");

		const imageContainer = qs('div.image-list', illustElem);
		const titleElem = qs('p.illust-title', illustElem);
		const userContainer = qs('div.user-container', illustElem);

		if (!(imageContainer instanceof HTMLDivElement)) throw new Error("Illustration image container isn't a div element.");
		if (!(titleElem instanceof HTMLParagraphElement)) throw new Error("Illustration title element isn't a p element.");
		if (!(userContainer instanceof HTMLDivElement)) throw new Error("Illustration user container isn't a div element.");

		const userImage = qs('img', userContainer);
		const userNameElem = qs('p', userContainer);

		if (!(userImage instanceof HTMLImageElement)) throw new Error("Illustration user image isn't an image element.");
		if (!(userNameElem instanceof HTMLParagraphElement)) throw new Error("Illustration user nane element isn't a p element.");

		titleElem.innerText = illustInfo.title;

		// Get user name and image from idb and set them

		// Add images to imageContainer
		const imgElem = document.createElement('img');
		imgElem.loading = 'lazy';
		imgElem.decoding = 'async';

		const url = illustInfo.pages[0].overwrite ?? illustInfo.pages[0].original;

		const imgRequest: IDBRequest<PixivViewer.Base64Image> = idb.transaction('Base64Images', 'readonly').objectStore('Base64Images').get(url);

		imgRequest.addEventListener('error', (event) => { });
		imgRequest.addEventListener('success', (event) => {
			imgElem.src = imgRequest.result.b64Data;

			imgElem.decode().then(() => imageContainer.append(imgElem));
		});

		// Show element
		qs('main')?.append(illustElem); // temporary

		cursor.continue();
	});
});

addIllustrationElements();
