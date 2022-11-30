import { sendMessageToFrame } from './utils.js';

const module: ModuleObject = { id: 'historyEvent' };

module.historyStateUpdatedHandler = (details) => {
	if (details.url.startsWith('chrome')) return;


	sendMessageToFrame(details.tabId, details.frameId, module.id, null).catch((reason) => {

		// Try to reload the tab in case the content script isn't injected (e.g. after extension reload)
		chrome.tabs.reload(details.tabId).catch((reason) => {
			// May fail if the tab doesn't exist for some reason (this catch is here because that happened)
			chrome.tabs.create({ active: true, url: 'sites/showError/index.html?' + btoa(`${details.url}\n${reason}`) });
		});
	});
};

export default module;