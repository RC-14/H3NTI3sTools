export { default as StorageHelper } from '../StorageHelper.js';

export const sendMessageToTab: sendMessageToTab = (tabId, handler, msg, data) => {
	return chrome.tabs.sendMessage<RuntimeMessage>(tabId, {
		target: 'content',
		handler,
		msg,
		data
	});
};
