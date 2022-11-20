import { sendMessageToFrame } from './utils.js';

const module: ModuleObject = { id: 'historyEvent' };

module.historyStateUpdatedHandler = (details) => {
	if (details.url.startsWith('chrome')) return;

	sendMessageToFrame(details.tabId, details.frameId, module.id, null).catch((reason) => {
		// Reload tab if the content script isn't injected
		chrome.tabs.reload(details.tabId);
	});
};

export default module;