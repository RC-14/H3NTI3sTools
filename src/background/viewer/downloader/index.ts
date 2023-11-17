import { z } from 'zod';
import handlerMap from './handlers';
import { DATA_OS_NAME, DataSchema, MEDIA_OS_NAME, MediaSchema, UrlSchema, getFromObjectStore, getViewerIDB, type DownloadHandler } from '/src/lib/viewer';

// TODO: Rewrite the whole thing with pointers to "media" and "data" be URIs that use "h3nti3+type+handler" protocols where type specifies the type (media or data) and handler specifies the handler to use.

type DownloadQueue = { url: string, resolve: () => void, reject: (reason: Error) => void; }[];
type QueueMap = Map<string, DownloadQueue>;
type ActiveDownloadersMap = Map<string, boolean>;

const mediaQueues: QueueMap = new Map();
const dataQueues: QueueMap = new Map();

let activeMediaDownloaders: ActiveDownloadersMap = new Map();
let activeDataDownloaders: ActiveDownloadersMap = new Map();

const getHostDomainFromUrl = (url: string) => {
	const { host } = new URL(url);

	const hostParts = host.split('.');

	return hostParts.splice(hostParts.length - 2).join('.');
};

const isInIdb = async (key: IDBValidKey, validationSchema: z.AnyZodObject, objectStoreName: IDBObjectStore['name']) => {
	return validationSchema.safeParse(await getFromObjectStore(key, objectStoreName)).success;
};

const writeToIdb = (data: unknown, validationSchema: z.AnyZodObject, objectStoreName: IDBObjectStore['name']) => new Promise<void>(async (resolve, reject) => {
	const parsedData = validationSchema.safeParse(data);

	if (!parsedData.success) {
		reject(new Error(`Can't write invalid data to iDB (object store: "${objectStoreName}"): ${parsedData.error}`));
		return;
	}

	const db = await getViewerIDB();

	const readTransaction = db.transaction(objectStoreName, 'readonly');
	const keyPath = readTransaction.objectStore(objectStoreName).keyPath;
	readTransaction.commit();

	if (Array.isArray(keyPath)) throw new Error(`Can't handle array keyPaths: ${keyPath}`);
	const key = parsedData.data[keyPath];

	if (await isInIdb(key, validationSchema, objectStoreName)) {
		console.warn(new Error(`Tried to write data to iDB for a key that's already present. (object store: "${objectStoreName}", key: "${key}")`));
		resolve();
		return;
	}

	const transaction = db.transaction(objectStoreName, 'readwrite');
	const request = transaction.objectStore(objectStoreName).add(parsedData.data);

	request.addEventListener('error', (event) => {
		db.close();
		reject(new Error(`Couldn't write data to iDB (object store: "${objectStoreName}"): ${request.error}`));
	});
	request.addEventListener('success', (event) => {
		db.close();
		resolve();
	});

	transaction.commit();
});

const downloader = async (queue: DownloadQueue, handler: (url: string) => Promise<unknown>, validationSchema: z.AnyZodObject, objectStoreName: IDBObjectStore['name']) => {
	while (queue.length > 0) {
		const current = queue.splice(0, 1)[0]!;

		if (await isInIdb(current.url, validationSchema, objectStoreName)) {
			current.resolve();
			return;
		}

		try {
			const result = await handler(current.url);
			await writeToIdb(result, validationSchema, objectStoreName);
			current.resolve();
		} catch (error) {
			/*
			 * Technically I don't know if it's an error
			 * but what am I supposed to do if it isn't?
			 * 
			 * Throw an error?
			 * 
			 * What am I going to do with the not error
			 * that probably contains information about
			 * something I should fix?
			 * 
			 * The better question here is "Why can you even throw something that's not an error?".
			 */
			current.reject(new Error(`Error during download (object store: "${objectStoreName}"): ${error}`));
		}
	}
};

const startDownloader = (hostDomain: string, queue: DownloadQueue, activeDownloadersMap: ActiveDownloadersMap, validationSchema: z.AnyZodObject, objectStoreName: IDBObjectStore['name'], handlerType: keyof DownloadHandler) => {
	activeDownloadersMap.set(hostDomain, true);

	let handler = handlerMap.get(hostDomain);
	if (handler === undefined) {
		if (handlerType !== 'data') throw new Error(`Reached startDownloader without a handler for the handlerType: ${handlerType}`);
		handler = handlerMap.get('ganeric');
		if (handler === undefined) throw new Error(`No generic handler found.`);
	}

	downloader(queue, handler[handlerType], validationSchema, objectStoreName).then(() => {
		activeDownloadersMap.set(hostDomain, false);
	});
};

const queueDownload = (url: string, queueMap: QueueMap, activeDownloadersMap: ActiveDownloadersMap, validationSchema: z.AnyZodObject, objectStoreName: IDBObjectStore['name'], handlerType: keyof DownloadHandler) => new Promise<void>((resolve, reject) => {
	const parsedUrl = UrlSchema.parse(url);

	const hostDomain = getHostDomainFromUrl(parsedUrl);
	if (!handlerMap.has(hostDomain) && handlerType !== 'data') throw new Error(`No download handler for domain: ${hostDomain}`);

	if (!queueMap.has(hostDomain)) {
		queueMap.set(hostDomain, []);
	}

	const queue = queueMap.get(hostDomain)!;

	queue.push({
		url: parsedUrl,
		resolve,
		reject
	});

	if (activeDownloadersMap.get(hostDomain)) return;

	startDownloader(hostDomain, queue, activeDownloadersMap, validationSchema, objectStoreName, handlerType);
});

export const downloadMedia = (url: string) => queueDownload(url, mediaQueues, activeMediaDownloaders, MediaSchema, MEDIA_OS_NAME, 'media');

export const downloadData = (url: string) => queueDownload(url, dataQueues, activeDataDownloaders, DataSchema, DATA_OS_NAME, 'data');
