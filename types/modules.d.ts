interface ModuleObject {
	id: string;
	runtimeMessageHandler?: RuntimeMessageHandler;
	historyStateUpdatedHandler?: HistoryStateUpdatedHandler;
}

interface RuntimeMessage {
	target: 'content' | 'popup' | 'worker';
	handler: ModuleObject['id'];
	msg: string | null;
	data?: jsonValue;
}

type sendRuntimeMessage = (target: RuntimeMessage['target'], handler: RuntimeMessage['handler'], msg: RuntimeMessage['msg'], data?: RuntimeMessage['data']) => Promise<RuntimeMessage['data']>;
type sendMessageToTab = (tabId: number, handler: RuntimeMessage['handler'], msg: string | null, data?: RuntimeMessage['data']) => Promise<RuntimeMessage['data']>;
type sendMessageToFrame = (tabId: number, frameId: number, handler: RuntimeMessage['handler'], msg: string | null, data?: RuntimeMessage['data']) => Promise<RuntimeMessage['data']>;

type RuntimeMessageHandler = (msg: RuntimeMessage['msg'], data: RuntimeMessage['data'], sender: chrome.runtime.MessageSender) => Promise<RuntimeMessage['data']>;
type HistoryStateUpdatedHandler = (details: chrome.webNavigation.WebNavigationTransitionCallbackDetails) => void;
