import { sendMessageToFrame } from './utils.js';

const module: ModuleObject = { id: 'historyEvent' };

module.historyStateUpdatedHandler = (details) => {
	if (details.url.startsWith('chrome')) return;

	chrome.scripting.executeScript({
		target: {
			tabId: details.tabId,
			frameIds: [details.frameId]
		},
		injectImmediately: true,
		func: () => {
			dispatchEvent(new Event('historystateupdated'));
		},
	});
};

export default module;
