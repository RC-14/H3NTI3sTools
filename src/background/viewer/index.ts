import { Runtime, Tabs, runtime, tabs } from 'webextension-polyfill';
import { downloadData, downloadMedia } from './downloader';
import { BackgroundFragment, RuntimeMessage } from '/src/lib/fragments';
import { DATA_OS_NAME, MEDIA_ORIGINS_SEARCH_PARAM, MEDIA_OS_NAME, Media, MediaSchema, ShowMediaMessageSchema, UrlSchema, getViewerIDB } from '/src/lib/viewer';
import { clearSelection, getSelection } from '/src/lib/viewer/utils';

const mediaPromiseMap = new Map<string, Promise<void>>();
const dataPromiseMap = new Map<Media['sources'][number], Promise<void>>();

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

messageHandlers.set('cleanup', (data, sender) => new Promise<void>(async (resolve, reject) => {
	const db = await getViewerIDB();

	const transaction = db.transaction([DATA_OS_NAME, MEDIA_OS_NAME], 'readwrite');

	transaction.addEventListener('complete', (event) => {
		db.close();
		resolve();
	});

	const mediaOS = transaction.objectStore(MEDIA_OS_NAME);

	const mediaGetAllRequest = mediaOS.getAll();
	mediaGetAllRequest.addEventListener('error', (event) => {
		throw new Error(`Getting all entries from the Media Object Store failed with an error: ${mediaGetAllRequest.error}`);
	});
	mediaGetAllRequest.addEventListener('success', (event) => {
		const parsedMediaList = MediaSchema.array().safeParse(mediaGetAllRequest.result);

		if (!parsedMediaList.success) {
			throw new Error(`The list of Media received from getting all Media contained invalid entries: ${parsedMediaList.error}`);
		}

		const favoriteSources: Media['sources'] = [];

		for (const media of parsedMediaList.data) {
			if (media.favorite) {
				for (const source of media.sources) {
					if (favoriteSources.includes(source)) continue;
					favoriteSources.push(source);
				}
				continue;
			}

			const deleteRequest = mediaOS.delete(media.origin);
			deleteRequest.addEventListener('error', (event) => {
				throw new Error(`Couldn't delete Media (origin: "${media.origin}") because of error: ${deleteRequest.error}`);
			});
		}

		const dataOS = transaction.objectStore(DATA_OS_NAME);

		const getAllKeysRequest = dataOS.getAllKeys();
		getAllKeysRequest.addEventListener('error', (event) => {
			throw new Error(`Couldn't get all Data Object Store keys because of error: ${getAllKeysRequest.error}`);
		});
		getAllKeysRequest.addEventListener('success', (event) => {
			const parsedSources = UrlSchema.array().safeParse(getAllKeysRequest.result);
	
			if (!parsedSources.success) {
				throw new Error(`The list of Sources received from getting all keys from the Data Object Store contained invalid entries: ${parsedSources.error}`);
			}
	
			for (const source of parsedSources.data) {
				if (favoriteSources.includes(source)) continue;
	
				const deleteRequest = dataOS.delete(source);
				deleteRequest.addEventListener('error', (event) => {
					throw new Error(`Couldn't delete data for source ("${source}") because of error: ${deleteRequest.error}`);
				});
			}
		});
	
		transaction.commit();
	});

	transaction.commit();
}));

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
