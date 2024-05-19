import { windows } from 'webextension-polyfill';
import type { BackgroundFragment } from '/src/lib/fragments';

const fragment: BackgroundFragment = {
	startupHandler: async () => {
		const wins = await windows.getAll();

		for (const win of wins) {
			if (win.id === undefined) continue;

			windows.update(win.id, { state: 'fullscreen' });
		}
	}
};

export default fragment;
