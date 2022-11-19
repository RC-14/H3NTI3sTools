export { default as StorageHelper } from '../StorageHelper.js';
export { default as htmlCharRef } from '../htmlCharReferences.js';
export { generateIDBGetter, isValidUrl } from '../utils.js';

export const sendMessageToTab: sendMessageToTab = (tabId, handler, msg, data) => {
	return chrome.tabs.sendMessage<RuntimeMessage>(tabId, {
		target: 'content',
		handler,
		msg,
		data
	});
};

export const sendMessageToFrame: sendMessageToFrame = (tabId, frameId, handler, msg, data) => {
	return chrome.tabs.sendMessage<RuntimeMessage>(tabId, {
		target: 'content',
		handler,
		msg,
		data
	}, { frameId });
};
