import { runtime } from 'webextension-polyfill';
import { BackgroundFragment, RuntimeMessageHandler, RuntimeMessageSchema } from '/src/lib/fragments';
import { JSONValue } from '/src/lib/json.js';
// Background fragments
import * as hideCursor from './hideCursor';
import * as viewer from './viewer';

const fragments: Map<string, BackgroundFragment> = new Map();
fragments.set('hideCursor', hideCursor);
fragments.set('viewer', viewer);

/*
 * Register Handlers
 */

const runtimeMessageHandlers: Map<string, RuntimeMessageHandler> = new Map();

for (const id of fragments.keys()) {
	const fragment = fragments.get(id);

	if (fragment?.runtimeMessageHandler) runtimeMessageHandlers.set(id, fragment.runtimeMessageHandler);
}

/*
 * Add Listeners
 */

runtime.onMessage.addListener(async (request: JSONValue, sender) => {
	const { target, fragmentId, msg, data } = RuntimeMessageSchema.parse(request);

	if (target !== 'background') return;
	if (!runtimeMessageHandlers.has(fragmentId)) throw new Error(`No handler for: ${fragmentId}`);

	return await runtimeMessageHandlers.get(fragmentId)!(msg, data, sender);
});
