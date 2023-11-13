import '/src/lib/devToolHelpers';
import { qs, sendRuntimeMessage } from '/src/lib/utils';

const cleanupButton = qs<HTMLButtonElement>('button#cleanup-button');
if (!(cleanupButton instanceof HTMLButtonElement)) throw new Error(`Didn't find cleanup button.`);

cleanupButton.addEventListener('click', async (event) => {
	cleanupButton.disabled = true;
	cleanupButton.innerText = 'Working...';

	await sendRuntimeMessage('background', 'viewer', 'cleanup');

	cleanupButton.innerText = 'Done!';
});
