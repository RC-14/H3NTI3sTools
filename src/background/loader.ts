import { runtime } from 'webextension-polyfill';
import type { BackgroundFragment, RuntimeMessageHandler, StartupHandler } from '/src/lib/fragments';
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

for (const id of fragments.keys()) {
	const fragment = fragments.get(id)!;

	if (fragment.startupHandler) startupHandlers.set(id, fragment.startupHandler);
	if (fragment.runtimeMessageHandler) runtimeMessageHandlers.set(id, fragment.runtimeMessageHandler);
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
