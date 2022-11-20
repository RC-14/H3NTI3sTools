import { generateIDBGetter } from './utils.js';

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

	// Get all entries with a date older than a week
	const dateRange = IDBKeyRange.bound(0, Date.now() - 1000 * 60 * 60 * 24 * 7);
	const request = objectStore.index('date').getAllKeys(dateRange);
	
	request.addEventListener('error', (event) => {
		throw request.error;
	});
	request.addEventListener('success', async (event) => {
		await deleteAllFromObjectStore(request.result, objectStore);
	});
};

const runtimeMessageHandler: RuntimeMessageHandler = async (msg, data, sender) => {
	switch (msg) {
		case 'cleanupIDB':
			return await cleanupIDB();

		default:
			return;
	}
};

export default {
	id: 'pixivViewer',
	runtimeMessageHandler
};