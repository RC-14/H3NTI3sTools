import { History, history, runtime, tabs } from 'webextension-polyfill';
import { BackgroundFragment } from '/src/lib/fragments';

const EXTENSION_BASE_URL = `moz-extension://${runtime.id}/`;
const HISTORY_ENTRY_PROTOCOL = 'h3nti3:';

tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
	if (!changeInfo.url?.startsWith(HISTORY_ENTRY_PROTOCOL)) return;

	await tabs.update(tabId, { url: `${EXTENSION_BASE_URL}${changeInfo.url.substring(HISTORY_ENTRY_PROTOCOL.length)}` });
});

const fragment: BackgroundFragment = {
	runtimeMessageHandler: async (msg, data, sender) => {
		if (sender.url === undefined || sender.tab === undefined) throw new Error(`[historyRecorder] Message didn't come from a tab.`);
		if (sender.tab.incognito) throw new Error(`[historyRecorder] Message came from an incognito/private tab.`);
		if (!sender.url.startsWith(EXTENSION_BASE_URL)) throw new Error(`[historyRecorder] Message didn't come from a page of this extension.`);

		const historyEntry: History.AddUrlDetailsType = {
			url: `${HISTORY_ENTRY_PROTOCOL}${sender.url.substring(EXTENSION_BASE_URL.length)}`
		};
		if (sender.tab?.title !== undefined) historyEntry.title = sender.tab.title;

		await history.addUrl(historyEntry);
	}
};

export default fragment;
