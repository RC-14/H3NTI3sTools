import { runtime } from 'webextension-polyfill';
import type { BackgroundFragment, ExternalRuntimeMessageHandler, RuntimeMessageHandler, StartupHandler } from '/src/lib/fragments';
import { RuntimeMessageSchema } from '/src/lib/fragments';
import type { JSONValue } from '/src/lib/json.js';
// Background fragments
import hideCursor from './hideCursor';
import historyRecorder from './historyRecorder';
import viewer from './viewer';

const fragments: Map<string, BackgroundFragment> = new Map();
fragments.set('hideCursor', hideCursor);
fragments.set('historyRecorder', historyRecorder);
fragments.set('viewer', viewer);

/*
 * Register Handlers
 */

const startupHandlers = new Map<string, StartupHandler>();
const runtimeMessageHandlers = new Map<string, RuntimeMessageHandler>();
const externalRuntimeMessageHandlers = new Map<string, ExternalRuntimeMessageHandler>();

for (const id of fragments.keys()) {
	const fragment = fragments.get(id)!;

	if (fragment.startupHandler) startupHandlers.set(id, fragment.startupHandler);
	if (fragment.runtimeMessageHandler) runtimeMessageHandlers.set(id, fragment.runtimeMessageHandler);
	if (fragment.externalRuntimeMessageHandler) externalRuntimeMessageHandlers.set(id, fragment.externalRuntimeMessageHandler);
}

/*
 * Add Listeners
 */

runtime.onStartup.addListener(async () => {
	for (const handler of startupHandlers.values()) {
		handler();
	}
});

runtime.onMessage.addListener(async (request: JSONValue, sender) => {
	const { target, fragmentId, msg, data } = RuntimeMessageSchema.parse(request);

	if (target !== 'background') return;
	if (!runtimeMessageHandlers.has(fragmentId)) throw new Error(`No handler for: ${fragmentId}`);

	return await runtimeMessageHandlers.get(fragmentId)!(msg, data, sender);
});

runtime.onMessageExternal.addListener(async (message: unknown, sender) => {
	let answer: unknown;

	for (const handler of externalRuntimeMessageHandlers.values()) {
		const result = handler(message, sender, answer);

		if (result) {
			if ('answer' in result) answer = result.answer;
			if (!result.continueProcessing) break;
		}
	}

	return answer;
});
