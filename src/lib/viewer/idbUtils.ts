import { generateIDBGetter } from '../utils';
import { Collection, CollectionSchema } from './types';

export const DATA_OS_NAME = 'Data';

export const MEDIA_OS_NAME = 'Media';
export const MEDIA_OS_NAME_INDEX_NAME = 'names';
export const MEDIA_OS_IMAGE_INDEX_NAME = 'images';
export const MEDIA_OS_TYPE_INDEX_NAME = 'types';
export const MEDIA_OS_SOURCE_INDEX_NAME = 'sources';
export const MEDIA_OS_FAVORITE_INDEX_NAME = 'favorites';
export const MEDIA_OS_TAG_INDEX_NAME = 'tags';
export const MEDIA_OS_CREATOR_NAME_INDEX_NAME = 'creatorNames';

export const COLLECTION_OS_NAME = 'Collections';
export const COLLECTION_OS_NAME_INDEX_NAME = 'names';
export const COLLECTION_OS_IMAGE_INDEX_NAME = 'images';
export const COLLECTION_OS_MEDIA_ID_INDEX_NAME = 'mediaIDs';

/**
 * Resolves to an IDBDatabase Object for the indexedDB of Viewer.
 */
export const getViewerIDB = generateIDBGetter('viewer', 1, (event) => {
	if (!(event.target.result instanceof IDBDatabase)) throw new Error("Couldn't get access to the Database.");
	if (!(event.target.transaction instanceof IDBTransaction)) throw new Error("Couldn't get access to the Transaction.");

	const db = event.target.result;
	const transaction = event.target.transaction;

	let dataOS: IDBObjectStore;
	let creatorsOS: IDBObjectStore;
	let mediaOS: IDBObjectStore;
	let collectionsOS: IDBObjectStore;

	if (event.oldVersion < 1) {
		dataOS = db.createObjectStore(DATA_OS_NAME, { keyPath: 'source' });

		mediaOS = db.createObjectStore(MEDIA_OS_NAME, { keyPath: 'origin' });
		mediaOS.createIndex(MEDIA_OS_NAME_INDEX_NAME, 'name');
		mediaOS.createIndex(MEDIA_OS_IMAGE_INDEX_NAME, 'image');
		mediaOS.createIndex(MEDIA_OS_TYPE_INDEX_NAME, 'type');
		mediaOS.createIndex(MEDIA_OS_SOURCE_INDEX_NAME, 'sources', { multiEntry: true });
		mediaOS.createIndex(MEDIA_OS_FAVORITE_INDEX_NAME, 'favorite');
		mediaOS.createIndex(MEDIA_OS_TAG_INDEX_NAME, 'tags', { multiEntry: true });
		mediaOS.createIndex(MEDIA_OS_CREATOR_NAME_INDEX_NAME, 'creatorNames', { multiEntry: true });

		collectionsOS = db.createObjectStore(COLLECTION_OS_NAME, { keyPath: 'id' });
		collectionsOS.createIndex(COLLECTION_OS_NAME_INDEX_NAME, 'name');
		collectionsOS.createIndex(COLLECTION_OS_IMAGE_INDEX_NAME, 'image');
		collectionsOS.createIndex(COLLECTION_OS_MEDIA_ID_INDEX_NAME, 'mediaIDs', { multiEntry: true });
	} else {
		dataOS = transaction.objectStore(DATA_OS_NAME);
		mediaOS = transaction.objectStore(MEDIA_OS_NAME);
		collectionsOS = transaction.objectStore(COLLECTION_OS_NAME);
	}
});

/**
 * A promise based wrapper to get data from an object store.
 * 
 * @param key A valid indexedDB key or key range.
 * 
 * @param objectStoreName Name of the object store from which to get data.
 * 
 * @returns A promise that resolves to whatever the result is or rejects with the error if an error occurred.
 */
export const getFromObjectStore = (key: IDBValidKey | IDBKeyRange, objectStoreName: IDBObjectStore['name']) => new Promise<unknown>(async (resolve, reject) => {
	const db = await getViewerIDB();

	const transaction = db.transaction(objectStoreName);
	transaction.addEventListener('error', (event) => {
		db.close();

		reject(transaction.error);
	});

	const request = transaction.objectStore(objectStoreName).get(key);
	request.addEventListener('success', (event) => {
		db.close();

		resolve(request.result);
	});

	transaction.commit();
});

type createCollectionOptionals = { description?: Collection['description'], image?: Collection['image'] }

export const createCollection = (name: Collection['name'], mediaOrigins: Collection['mediaOrigins'], { description, image }: createCollectionOptionals = {}) => new Promise<string>(async (resolve, reject) => {
	const collection: Collection = {
		id: crypto.randomUUID(),
		name,
		mediaOrigins,
		description,
		image
	};

	const parsedCollection = CollectionSchema.parse(collection);

	const db = await getViewerIDB();
	const transaction = db.transaction(COLLECTION_OS_NAME, 'readwrite');
	const request = transaction.objectStore(COLLECTION_OS_NAME).add(parsedCollection);

	request.addEventListener('error', (event) => {
		db.close();
		reject(request.error);
	});
	request.addEventListener('success', (event) => {
		db.close();
		resolve(parsedCollection.id);
	});

	transaction.commit();
});
