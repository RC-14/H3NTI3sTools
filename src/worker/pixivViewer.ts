import { generateIDBGetter, StorageHelper } from './utils.js';

const module: ModuleObject = { id: 'pixivViewer' };

const WEEK_IN_MS = 1000 * 60 * 60 * 24 * 7;

const storage = new StorageHelper('session', module.id);

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

const deleteAllFromObjectStore = (keys: IDBValidKey[], objectStore: IDBObjectStore) => new Promise<PromiseSettledResult<void>[]>((resolve, reject) => {
	if (objectStore.transaction.mode === 'readonly') throw new Error('ObjectStore is part of a readonly transaction.');

	const promises: Promise<void>[] = [];

	for (const key of keys) {
		promises.push(new Promise<void>((resolve, reject) => {
			const request = objectStore.delete(key);

			request.addEventListener('error', (event) => reject(request.error));
			request.addEventListener('success', (event) => resolve());
		}));
	}

	Promise.allSettled(promises).then(resolve);
});

const show = (artworks: PixivViewer.Artwork[], tabId?: chrome.tabs.Tab['id'] | null) => {
	const url = new URL(chrome.runtime.getURL('sites/pixivViewer/presentation/index.html'));
	url.search = btoa(JSON.stringify(artworks));

	if (tabId === null) {
		chrome.tabs.update({ url: url.href });
	} else if (typeof tabId === 'number') {
		chrome.tabs.update(tabId, { url: url.href });
	} else {
		chrome.tabs.create({ url: url.href });
	}
};

/*
 * msg handlers
 */

const cleanupIDB = async () => {
	const db = await getIDB();
	const objectStore = db.transaction('Base64Images', 'readwrite').objectStore('Base64Images');

	// Get the keys of all expired entries
	const expiryDateRange = IDBKeyRange.bound(0, Date.now());
	const request = objectStore.index('expiryDate').getAllKeys(expiryDateRange);

	request.addEventListener('error', (event) => {
		throw request.error;
	});
	request.addEventListener('success', async (event) => {
		// Delete all entries that we got a key of
		await deleteAllFromObjectStore(request.result, objectStore);
	});
};

const showSelection = async (messageData: PixivViewer.ShowMessageData) => {
	const selection = await storage.get('selection');
	storage.set({ isSelecting: false, selection: [] });

	if (!Array.isArray(selection)) return;

	show(selection, messageData.tabId);
};

const showArtwork = async (messageData: PixivViewer.ShowMessageData) => {
	if (messageData.artwork === undefined) return;

	show([messageData.artwork], messageData.tabId);
};

module.runtimeMessageHandler = (msg, data, sender) => {
	let showMessageData: PixivViewer.ShowMessageData = {};

	// Write data into showMessageData
	if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
		if (typeof data.tabId === 'number' || data.tabId === null) {
			showMessageData.tabId = data.tabId;
		}

		if (typeof data.artwork === 'string') {
			showMessageData.artwork = data.artwork;
		} else if (typeof data.artwork === 'object' && data.artwork !== null && !Array.isArray(data.artwork) && typeof data.artwork.pixivId === 'number') {
			showMessageData.artwork = { pixivId: data.artwork.pixivId };

			// Check if data.artwork.exclude is compatible with type number[]
			if (Array.isArray(data.artwork.exclude) && !data.artwork.exclude.some((value) => typeof value !== 'number')) {
				showMessageData.artwork.exclude = data.artwork.exclude as number[];
			}

			// Check if data.artwork.overwrite is compatible with type (string | null)[]
			if (Array.isArray(data.artwork.overwrite) && !data.artwork.overwrite.some((value) => typeof value !== 'string' && value !== null)) {
				showMessageData.artwork.overwrite = data.artwork.overwrite as (string | null)[];
			}

			if (typeof data.artwork.ignoreOverwrite === 'boolean') {
				showMessageData.artwork.ignoreOverwrite = data.artwork.ignoreOverwrite;
			}
		}
	}

	switch (msg) {
		case 'cleanupIDB':
			return cleanupIDB();

		case 'showSelection':
			return showSelection(showMessageData);

		case 'showArtwork':
			return showArtwork(showMessageData);
		
		default:
			throw new Error(`Can't handle msg: ${msg}`);
	}
};

export default module;