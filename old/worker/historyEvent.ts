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
	}).catch((error) => { /* Tabs may get removed before executeScript() gets called. For some reason a real world problem. */ });
};

export default module;
