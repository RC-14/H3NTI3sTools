import { runtime, tabs, type Tabs } from 'webextension-polyfill';
import '/src/lib/devToolHelpers';
import { qs, sendRuntimeMessage } from '/src/lib/utils';
import type { ShowMediaMessage } from '/src/lib/viewer';

const cleanupButton = qs<HTMLButtonElement>('button#cleanup-button');
const openTabInPresentationButton = qs<HTMLButtonElement>('button#open-tab-in-presentation');

let tab: Tabs.Tab | undefined = undefined;

if (!(
	cleanupButton &&
	openTabInPresentationButton
)) throw new Error(`Not all elements were found before adding functionality.`);

// Enable open tab in presentation button
tabs.query({ active: true, currentWindow: true }).then((tabArray) => {
	tab = tabArray[0];

	if (!tab) return;
	if (!tab.url || tab.url.startsWith(runtime.getURL(''))) return;

	openTabInPresentationButton.disabled = false;
});

cleanupButton.addEventListener('click', async (event) => {
	cleanupButton.disabled = true;
	cleanupButton.innerText = 'Working...';

	await sendRuntimeMessage('background', 'viewer', 'cleanup');

	cleanupButton.innerText = 'Done!';
});

openTabInPresentationButton.addEventListener('click', async (event) => {
	openTabInPresentationButton.disabled = true;

	if (!tab?.url) throw new Error("Couldn't get the URL of the active Tab.");

	const data: ShowMediaMessage = {
		origins: [tab.url],
		targetTab: tab.pinned ? -1 : -2
	};

	await sendRuntimeMessage('background', 'viewer', 'showMedia', data);

	window.parent.close();
});
