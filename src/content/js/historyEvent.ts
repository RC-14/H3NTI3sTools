chrome.runtime.onMessage.addListener((message: RuntimeMessage, sender, sendResponse) => {
	dispatchEvent(new Event('historystateupdated'));
	sendResponse();
});
