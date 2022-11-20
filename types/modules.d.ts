interface ModuleObject {
	id: string;
	runtimeMessageHandler?: RuntimeMessageHandler;
	historyStateUpdatedHandler?: HistoryStateUpdatedHandler;
}

interface RuntimeMessage {
	handler: ModuleObject['id'];
	msg: string | null;
	data?: string | number | boolean | void | jsonObject | jsonArray | null;
}

type sendRuntimeMessage = (handler: RuntimeMessage['handler'], msg: RuntimeMessage['msg'], data?: RuntimeMessage['data']) => Promise<RuntimeMessage['data']>;
type sendMessageToTab = (tabId: number, handler: RuntimeMessage['handler'], msg: string | null, data?: RuntimeMessage['data']) => Promise<RuntimeMessage['data']>;
type sendMessageToFrame = (tabId: number, frameId: number, handler: RuntimeMessage['handler'], msg: string | null, data?: RuntimeMessage['data']) => Promise<RuntimeMessage['data']>;

type RuntimeMessageHandler = (msg: RuntimeMessage['msg'], data: RuntimeMessage['data'], sender: chrome.runtime.MessageSender) => RuntimeMessage['data'];
type HistoryStateUpdatedHandler = (details: chrome.webNavigation.WebNavigationTransitionCallbackDetails) => void;
