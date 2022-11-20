// Set storage access level
const ACCESS_LEVELS = chrome.storage.AccessLevel;

chrome.storage.session.setAccessLevel({ accessLevel: ACCESS_LEVELS.TRUSTED_AND_UNTRUSTED_CONTEXTS });

/*
 * imports
 */
import pixivViewer from './pixivViewer.js';
import historyEvent from './historyEvent.js';

const moduleList: ModuleObject[] = [
	pixivViewer,
	historyEvent
];

/*
 * Register handlers
 */
const runtimeMessageHandlerMap: Map<ModuleObject['id'], RuntimeMessageHandler> = new Map();
const historyStateUpdatedHandlerMap: Map<ModuleObject['id'], HistoryStateUpdatedHandler> = new Map();

for (const module of moduleList) {
	if (module.runtimeMessageHandler !== undefined) runtimeMessageHandlerMap.set(module.id, module.runtimeMessageHandler);
	if (module.historyStateUpdatedHandler !== undefined) historyStateUpdatedHandlerMap.set(module.id, module.historyStateUpdatedHandler);
}

/*
 * Add listeners
 */
chrome.runtime.onMessage.addListener((request: RuntimeMessage, sender, sendResponse) => {
	// Check if the message handler exists
	const handler = runtimeMessageHandlerMap.get(request.handler);
	// If it doesn't exist, throw an error
	if (handler == null) throw new Error(`No handler for "${request.handler}"`);

	// Call the handler and send the result back as the response
	const response = handler(request.msg, request.data, sender);
	console.log('[message]', request.handler, request.msg, request.data, '->', response);
	sendResponse(response);
});

chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
	historyStateUpdatedHandlerMap.forEach((handler, id) => handler(details));
});
