import { Scripting, scripting } from 'webextension-polyfill';
import StorageHelper from '/src/lib/StorageHelper';
import { BackgroundFragment } from '/src/lib/fragments';

// Clears the storage every time the extension gets loaded.
// This is done to prevent unexpectedly hiding the cursor.
const storage = new StorageHelper('local', 'hideCursor');
storage.clear();

const fragment: BackgroundFragment = {
	runtimeMessageHandler: async (msg, data, sender) => {
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
				scripting.insertCSS(injection);
				break;

			case 'show':
				scripting.removeCSS(injection);
				break;

			default:
				throw new Error('[hideCursor] Got unknown message: ' + msg);
		}
	}
};

export default fragment;
