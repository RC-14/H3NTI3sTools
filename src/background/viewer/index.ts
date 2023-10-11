import { runtime, tabs, type Runtime, type Tabs } from 'webextension-polyfill';
import { downloadData, downloadMedia } from './downloader';
import type { BackgroundFragment, RuntimeMessage } from '/src/lib/fragments';
import { COLLECTION_OS_NAME, CollectionSchema, DATA_OS_NAME, DataSchema, MEDIA_ORIGINS_SEARCH_PARAM, MEDIA_OS_NAME, MediaSchema, ShowMediaMessageSchema, UrlSchema, getViewerIDB, type Data, type Media } from '/src/lib/viewer';
import { clearSelection, getSelection } from '/src/lib/viewer/utils';

const mediaPromiseMap = new Map<string, Promise<void>>();
const dataPromiseMap = new Map<Media['sources'][number], Promise<void>>();

let cleanupPromise: Promise<void> | null;

const show = (origins: string[], targetTab?: Tabs.Tab['id'] | null) => {
	const parsedOrigins = UrlSchema.array().parse(origins);

	const url = new URL(runtime.getURL('pages/viewer/presentation/index.html'));
	url.searchParams.set(MEDIA_ORIGINS_SEARCH_PARAM, btoa(JSON.stringify(parsedOrigins)));

	if (targetTab === undefined) {
		tabs.create({ url: url.href });
		return;
	} else if (targetTab === null) {
		tabs.update({ url: url.href });
		return;
	}

	tabs.update(targetTab, { url: url.href });
};

const cleanup_collectionsPart = () => new Promise<void>(async (resolve, reject) => {
	const db = await getViewerIDB();
	const transaction = db.transaction(COLLECTION_OS_NAME, 'readwrite');
	const objectStore = transaction.objectStore(COLLECTION_OS_NAME);
	const cursorRequest = objectStore.openCursor();
	cursorRequest.addEventListener('error', (event) => {
		reject(new Error(`Getting collection media origins failed with an error: ${cursorRequest.error}`));
	});
	cursorRequest.addEventListener('success', (event) => {
		const cursor = cursorRequest.result;

		// null if all object store entries have been processed
		if (cursor === null) {
			resolve();
			return;
		}

		const parsedCollection = CollectionSchema.safeParse(cursor.value);

		if (!parsedCollection.success) {
			const deleteRequest = cursor.delete();
			deleteRequest.addEventListener('error', (event) => {
				reject(new Error(`Deleting broken collection (name: "${cursor.key}") failed with an error: ${deleteRequest.error}`));
			});
		}

		cursor.continue();
	});
});

const cleanup_mediaPart = () => new Promise<Data['source'][]>(async (resolve, reject) => {
	const dataWhitelist: Data['source'][] = [];

	const db = await getViewerIDB();
	const readTransaction = db.transaction(MEDIA_OS_NAME, 'readwrite');
	const readOS = readTransaction.objectStore(MEDIA_OS_NAME);
	const cursorRequest = readOS.openCursor();
	cursorRequest.addEventListener('error', (event) => {
		throw new Error(`Getting to be deleted media origins failed with an error: ${cursorRequest.error}`);
	});
	cursorRequest.addEventListener('success', (event) => {
		const cursor = cursorRequest.result;

		// null if all object store entries have been processed
		if (cursor === null) {
			// Deduplicate in place
			for (let i = dataWhitelist.length - 1; i >= 0; i--) {
				if (dataWhitelist.indexOf(dataWhitelist[i]!)) continue;
				dataWhitelist.splice(i, 1);
			}

			resolve(dataWhitelist);
			return;
		}

		const parsedMedia = MediaSchema.safeParse(cursor.value);

		if (parsedMedia.success && (parsedMedia.data.favorite)) {
			dataWhitelist.push(...parsedMedia.data.sources);
		} else {
			const deleteRequest = cursor.delete();
			deleteRequest.addEventListener('error', (event) => {
				reject(new Error(`Deleting media (origin: "${cursor.key}") failed with an error: ${deleteRequest.error}`));
			});
		}

		cursor.continue();
	});
});

const cleanup_dataPart = (dataWhitelist: Data['source'][]) => new Promise<void>(async (resolve, reject) => {
	const db = await getViewerIDB();
	const readTransaction = db.transaction(DATA_OS_NAME, 'readwrite');
	const readOS = readTransaction.objectStore(DATA_OS_NAME);
	const cursorRequest = readOS.openCursor();
	cursorRequest.addEventListener('error', (event) => {
		throw new Error(`Getting to be deleted data sources failed with an error: ${cursorRequest.error}`);
	});
	cursorRequest.addEventListener('success', (event) => {
		const cursor = cursorRequest.result;

		// null if all object store entries have been processed
		if (cursor === null) {
			resolve();
			return;
		}

		const parsedMedia = DataSchema.safeParse(cursor.value);

		if (!parsedMedia.success || !dataWhitelist.includes(parsedMedia.data.source)) {
			const deleteRequest = cursor.delete();
			deleteRequest.addEventListener('error', (event) => {
				reject(new Error(`Deleting data (source: "${cursor.key}") failed with an error: ${deleteRequest.error}`));
			});
		}

		cursor.continue();
	});
});

/*
 * Message handlers
 */

const messageHandlers = new Map<RuntimeMessage['msg'], (data: RuntimeMessage['data'], sender: Runtime.MessageSender) => Promise<void | RuntimeMessage['data']>>();

messageHandlers.set('showMedia', async (data, sender) => {
	const { origins, targetTab } = ShowMediaMessageSchema.parse(data);
	show(origins, targetTab);
});

messageHandlers.set('showSelection', async (data, sender) => {
	if (data !== undefined && data !== null && typeof data !== 'number') throw new Error(`[viewer] Got an invalid target tab: ${data}`);

	const origins = await getSelection();

	show(origins, data);

	clearSelection();
});

messageHandlers.set('downloadMedia', async (data, sender) => {
	const origin = UrlSchema.parse(data);
	if (!mediaPromiseMap.has(origin)) {
		mediaPromiseMap.set(origin, downloadMedia(origin));
	}

	try {
		await mediaPromiseMap.get(origin);
	} catch (error) {
		mediaPromiseMap.delete(origin);
		console.error(error);
		return false;
	}
	return true;
});

messageHandlers.set('downloadData', async (data, sender) => {
	const source = UrlSchema.parse(data);
	if (!dataPromiseMap.has(source)) {
		dataPromiseMap.set(source, downloadData(source));
	}

	try {
		await dataPromiseMap.get(source);
	} catch (error) {
		console.error(error);
		return false;
	}
	return true;
});

messageHandlers.set('cleanup', (data, sender) => {
	if (cleanupPromise !== null) return cleanupPromise;

	cleanupPromise = new Promise<void>(async (resolve, reject) => {
		await cleanup_collectionsPart();
		const dataWhitelist = await cleanup_mediaPart();
		await cleanup_dataPart(dataWhitelist);

		cleanupPromise = null;
		resolve();
	});

	return cleanupPromise;
});

const fragment: BackgroundFragment = {
	startupHandler: () => {
		// Prevent carrying over a selection from a previous session.
		clearSelection();
		// Ensure nothing gets deleted automatically
		navigator.storage.persist().then((result) => result ? console.log('Got persistent storage.') : console.warn("Didn't get persistent storage."));
	},
	runtimeMessageHandler: async (msg, data, sender) => {
		const messageHandler = messageHandlers.get(msg);

		if (messageHandler === undefined) throw new Error(`[viewer] Got unknown message: ${msg}`);

		return await messageHandler(data, sender);
	}
};

export default fragment;
