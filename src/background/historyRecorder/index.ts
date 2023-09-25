import { History, Runtime, WebNavigation, extension, history, runtime, tabs, webNavigation } from 'webextension-polyfill';
import { BackgroundFragment } from '/src/lib/fragments';
import StorageHelper from '/src/lib/StorageHelper';

const EXTENSION_BASE_URL = runtime.getURL('');
const EXTENSION_HISTORY_ENTRY_PROTOCOL = 'ext+h3nti3:';
const PRIVATE_HISTORY_ENABLED_STORAGE_KEY = 'privateHistoryEnabled';

const storage = new StorageHelper('local', 'historyRecorder');

let privateHistoryEnabled = false;

const privateHistoryWebNavigationCommittedListener = async (details: WebNavigation.OnCommittedDetailsType) => {
	// Don't bother with subframes and browser pages
	if (details.frameId !== 0 || details.url.startsWith('about:') || details.url.startsWith('moz-extension:')) return;

	const tab = await tabs.get(details.tabId);
	if (!tab.incognito) return;

	const historyEntry: History.AddUrlDetailsType = {
		url: details.url,
		visitTime: details.timeStamp
	};

	if (tab.title !== undefined) historyEntry.title = tab.title;

	if (details.transitionType === 'start_page') {
		historyEntry.transition = 'auto_toplevel';
	} else {
		historyEntry.transition = details.transitionType;
	}

	history.addUrl(historyEntry);
};

const enablePrivateHistory = () => {
	webNavigation.onCommitted.addListener(privateHistoryWebNavigationCommittedListener);
	privateHistoryEnabled = true;
};

const disablePrivateHistory = () => {
	webNavigation.onCommitted.removeListener(privateHistoryWebNavigationCommittedListener);
	privateHistoryEnabled = false;
};

const handleRecordExtensionPage = async (sender: Runtime.MessageSender) => {
	if (sender.url === undefined || sender.tab === undefined) throw new Error(`[historyRecorder] Message didn't come from a tab.`);
	if (!sender.url.startsWith(EXTENSION_BASE_URL)) throw new Error(`[historyRecorder] Message didn't come from a page of this extension.`);

	if (sender.tab.incognito && !(privateHistoryEnabled && await extension.isAllowedIncognitoAccess())) return;

	const historyEntry: History.AddUrlDetailsType = {
		url: `${EXTENSION_HISTORY_ENTRY_PROTOCOL}${btoa(sender.url.substring(EXTENSION_BASE_URL.length))}`
	};
	if (sender.tab?.title !== undefined) historyEntry.title = sender.tab.title;

	await history.addUrl(historyEntry);
};

tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
	if (changeInfo.status !== 'complete' || !tab.url?.startsWith(`${EXTENSION_BASE_URL}${encodeURIComponent(EXTENSION_HISTORY_ENTRY_PROTOCOL)}`)) return;

	await tabs.update(tabId, {
		url: EXTENSION_BASE_URL + atob(decodeURIComponent(tab.url.split(encodeURIComponent(EXTENSION_HISTORY_ENTRY_PROTOCOL))[1]))
	});
});

const fragment: BackgroundFragment = {
	startupHandler: async () => {
		if (!await extension.isAllowedIncognitoAccess()) return;

		const storageValue = await storage.get(PRIVATE_HISTORY_ENABLED_STORAGE_KEY);

		if (typeof storageValue === 'boolean') {
			if (storageValue) enablePrivateHistory();
			return;
		}

		storage.set(PRIVATE_HISTORY_ENABLED_STORAGE_KEY, privateHistoryEnabled);
	},
	runtimeMessageHandler: async (msg, data, sender) => {
		switch (msg) {
			case 'recordExtensionPage':
				await handleRecordExtensionPage(sender);
				return;

			case 'hasIncognitoAccess':
				return await extension.isAllowedIncognitoAccess();

			case 'isPrivateHistoryEnabled':
				return privateHistoryEnabled;

			case 'enablePrivateHistory':
				enablePrivateHistory();
				return true;

			case 'disablePrivateHistory':
				disablePrivateHistory();
				return;
		}

		throw new Error(`[historyRecorder] Got unknown message: ${msg}`);
	}
};

export default fragment;
