import { runtime } from 'webextension-polyfill';
import { BackgroundFragment, RuntimeMessageHandler, RuntimeMessageSchema } from '/src/lib/fragments';
import { JSONValue } from '/src/lib/json.js';

// @ts-ignore Necessary because typescript doesn't know that parcel does glob imports
import * as __unsafe_fragments__ from './*/index.ts';

const fragments: Map<string, BackgroundFragment> = new Map(
	Object.entries(__unsafe_fragments__ as { [key: string]: BackgroundFragment; })
);

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

runtime.onMessage.addListener(async (request: JSONValue, sender, sendResponse: (response?: JSONValue | void) => void) => {
	const { target, fragmentId, msg, data } = RuntimeMessageSchema.parse(request);

	if (target !== 'background') return;
	if (!runtimeMessageHandlers.has(fragmentId)) throw new Error(`No handler for: ${fragmentId}`);

	sendResponse(await runtimeMessageHandlers.get(fragmentId)!(msg, data, sender));
});
