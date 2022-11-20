import { sendMessageToFrame } from './utils.js';

const module: ModuleObject = { id: 'historyEvent' };

module.historyStateUpdatedHandler = (details) => {
	if (details.url.startsWith('chrome')) return;

	// Wrapped in try catch because this can fail if the content script isn't loaded for whatever reason
	try {
		sendMessageToFrame(details.tabId, details.frameId, module.id, null);
	} catch (error) { }
};

export default module;