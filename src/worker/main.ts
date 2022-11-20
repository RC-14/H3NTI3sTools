import { sendMessageToFrame } from './utils.js';

// Set storage access level
const ACCESS_LEVELS = chrome.storage.AccessLevel;

chrome.storage.session.setAccessLevel({ accessLevel: ACCESS_LEVELS.TRUSTED_AND_UNTRUSTED_CONTEXTS });

/*
 * imports
 */
import pixivViewer from './pixivViewer.js';

const moduleList: {
	id: string,
	runtimeMessageHandler?: RuntimeMessageHandler
}[] = [pixivViewer];

/*
 * Register handlers
 */
const runtimeMessageHandlerMap: Map<string, RuntimeMessageHandler> = new Map();

for (const module of moduleList) {
	if (module.runtimeMessageHandler !== undefined) runtimeMessageHandlerMap.set(module.id, module.runtimeMessageHandler);
}

/*
 * Add listeners
 */
chrome.runtime.onMessage.addListener(async (request: RuntimeMessage, sender, sendResponse) => {
	// Only handle messages meant for the background script
	if (request.target !== 'background') return;

	// Check if the message handler exists
	const handler = runtimeMessageHandlerMap.get(request.handler);
	// If it doesn't exist, throw an error
	if (handler == null) throw new Error(`No handler for "${request.handler}"`);

	// Call the handler and send the result back as the response
	const response = await handler(request.msg, request.data, sender);
	console.log('[message]', request.handler, request.msg, request.data, '->', response);
	sendResponse(response);
});

chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
	if (details.url.startsWith('chrome')) return;
	sendMessageToFrame(details.tabId, details.frameId, 'historyEvent', null);
});
