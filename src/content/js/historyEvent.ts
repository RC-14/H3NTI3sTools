chrome.runtime.onMessage.addListener((message: RuntimeMessage, sender, sendResponse) => {
	if (message.target !== 'content' || message.handler !== 'historyEvent') return;

	dispatchEvent(new Event('historystateupdated'));
	sendResponse();
});
