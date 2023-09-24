import { History, Runtime, history, runtime, tabs } from 'webextension-polyfill';
import { BackgroundFragment } from '/src/lib/fragments';

const EXTENSION_BASE_URL = runtime.getURL('');
const HISTORY_ENTRY_PROTOCOL = 'ext+h3nti3:';

const handleRecord = async (sender: Runtime.MessageSender) => {
	if (sender.url === undefined || sender.tab === undefined) throw new Error(`[historyRecorder] Message didn't come from a tab.`);
	if (sender.tab.incognito) throw new Error(`[historyRecorder] Message came from an incognito/private tab.`);
	if (!sender.url.startsWith(EXTENSION_BASE_URL)) throw new Error(`[historyRecorder] Message didn't come from a page of this extension.`);

	const historyEntry: History.AddUrlDetailsType = {
		url: `${HISTORY_ENTRY_PROTOCOL}${btoa(sender.url.substring(EXTENSION_BASE_URL.length))}`
	};
	if (sender.tab?.title !== undefined) historyEntry.title = sender.tab.title;

	await history.addUrl(historyEntry);
};

tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
	if (changeInfo.status !== 'complete' || !tab.url?.startsWith(`${EXTENSION_BASE_URL}${encodeURIComponent(HISTORY_ENTRY_PROTOCOL)}`)) return;

	await tabs.update(tabId, {
		url: EXTENSION_BASE_URL + atob(decodeURIComponent(tab.url.split(encodeURIComponent(HISTORY_ENTRY_PROTOCOL))[1]))
	});
});

const fragment: BackgroundFragment = {
	runtimeMessageHandler: async (msg, data, sender) => {
		switch (msg) {
			case 'record':
				await handleRecord(sender);
				return;
		}

		throw new Error(`[historyRecorder] Got unknown message: ${msg}`);
	}
};

export default fragment;
