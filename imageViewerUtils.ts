import { generateIDBGetter } from './utils.js';

export const getIndexedDB = generateIDBGetter('imageViewer', 1, async (event) => {
	if (!(event.target instanceof IDBOpenDBRequest)) throw new Error('Event target is not an IDBOpenDBRequest.');
	if (!(event.target.result instanceof IDBDatabase)) throw new Error("Couldn't get access to the Database.");
	if (!(event.target.transaction instanceof IDBTransaction)) throw new Error("Couldn't get access to the Transaction.");

	const db = event.target.result;
	const transaction = event.target.transaction;

	let imagesOS: IDBObjectStore;
	let galleriesOS: IDBObjectStore;
	let authorsOS: IDBObjectStore;

	if (event.oldVersion < 1) {
		imagesOS = db.createObjectStore('Images', { keyPath: 'source' });

		galleriesOS = db.createObjectStore('Galleries', { keyPath: 'uuid' });
		galleriesOS.createIndex('names', 'name', { unique: false });
		galleriesOS.createIndex('favorites', 'favorite', { unique: false });
		galleriesOS.createIndex('sources', 'sources', { unique: false, multiEntry: true });
		galleriesOS.createIndex('tags', 'tags', { unique: false, multiEntry: true });
		galleriesOS.createIndex('authorUuids', 'authorUuid', { unique: false });

		authorsOS = db.createObjectStore('Authors', { keyPath: 'uuid' });
		authorsOS.createIndex('names', 'name', { unique: false });
		authorsOS.createIndex('avatars', 'avatar', { unique: false });
	} else {
		imagesOS = transaction.objectStore('Images');
		galleriesOS = transaction.objectStore('Galleries');
		authorsOS = transaction.objectStore('Authors');
	}
});
