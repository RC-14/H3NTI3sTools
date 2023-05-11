import { Scripting, scripting } from 'webextension-polyfill';
import { RuntimeMessageHandler } from '/src/lib/fragments';
import StorageHelper from '/src/lib/StorageHelper';

// Clears the storage every time the extension gets loaded.
// This is done to prevent unexpectedly hiding the cursor.
const storage = new StorageHelper('local', 'hideCursor');
storage.clear();

export const runtimeMessageHandler: RuntimeMessageHandler = async (msg, data, sender) => {
	if (sender.tab?.id === undefined) return;

	const injection: Scripting.CSSInjection = {
		files: ['inject/hideCursor.css'],
		target: {
			tabId: sender.tab.id,
			allFrames: true
		}
	};

	switch (msg) {
		case 'hide':
			await scripting.insertCSS(injection);
			break;

		case 'show':
			await scripting.removeCSS(injection);
			break;

		default:
			throw new Error('[hideCursor] Got unknown message: ' + msg);
	}
};
