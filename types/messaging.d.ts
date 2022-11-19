interface RuntimeMessage {
	target: 'content' | 'background';
	handler: string;
	msg: string | null;
	data?: any;
}

type sendRuntimeMessage = (handler: string, msg: string | null, data?: any) => Promise<any>;
type sendMessageToTab = (tabId: number, handler: string, msg: string | null, data?: any) => Promise<any>;
type sendMessageToFrame = (tabId: number, frameId: number, handler: string, msg: string | null, data?: any) => Promise<any>;

type RuntimeMessageHandler = (msg: string | null, data: any, sender: chrome.runtime.MessageSender) => any;
