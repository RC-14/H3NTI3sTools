import { generateIDBGetter } from './utils.js';

const moduleObject: ModuleObject = { id: 'pixivViewer' };

const WEEK_IN_MS = 1000 * 60 * 60 * 24 * 7;

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

moduleObject.runtimeMessageHandler = (msg, data, sender) => {
	switch (msg) {
		case 'cleanupIDB':
			cleanupIDB();
			break;
	}
};

export default moduleObject;