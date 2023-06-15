import { Runtime, Tabs, runtime, tabs } from 'webextension-polyfill';
import { downloadData, downloadMedia } from './downloader';
import { BackgroundFragment, RuntimeMessage } from '/src/lib/fragments';
import { IdSchema, Media, Name, ShowMediaMessageSchema, UrlSchema } from '/src/lib/viewer';
import { clearSelection, getSelection } from '/src/lib/viewer/utils';

const mediaPromiseMap = new Map<string, Promise<void>>();
const creatorPromiseMap = new Map<Name, Promise<void>>();
const dataPromiseMap = new Map<Media['sources'][number], Promise<void>>();

const show = (origins: string[], targetTab?: Tabs.Tab['id'] | null) => {
	const parsedOrigins = UrlSchema.array().parse(origins);

	const url = new URL(runtime.getURL('pages/viewer/presentation/index.html'));
	url.search = btoa(JSON.stringify(parsedOrigins));

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

messageHandlers.set('willCreatorExist', async (data, sender) => {
	const id = IdSchema.parse(data);
	if (!creatorPromiseMap.has(id)) return false;

	try {
		await creatorPromiseMap.get(id);
	} catch (error) {
		return false;
	}
	return true;
});

const fragment: BackgroundFragment = {
	startupHandler: () => {
		// Prevent carrying over a selection from a previous session.
		clearSelection();
	},
	runtimeMessageHandler: async (msg, data, sender) => {
		const messageHandler = messageHandlers.get(msg);

		if (messageHandler === undefined) throw new Error(`[viewer] Got unknown message: ${msg}`);

		return await messageHandler(data, sender);
	}
};

export default fragment;
