import { qs, runAfterReadyStateReached } from '/src/lib/utils';

const getCheckbox = () => qs<HTMLInputElement>('input[type="checkbox"][data-v-55ca7f47]');

runAfterReadyStateReached('complete', () => {
	// Automatically check the remember me checkbox in case I need to log in again.
	const rememberMeCheckbox = getCheckbox();
	if (rememberMeCheckbox?.checked !== false) return;

	const dialog = qs('div[role="dialog"]');
	if (!dialog) throw new Error(`Couldn't find a dialog to check remember me in.`);

	const observer = new MutationObserver((mutations, observer) => {
		// The proper styling for the checkbox only gets applied on click
		setTimeout(() => getCheckbox()?.click(), 10);

		// Only needed once
		observer.disconnect();
	});

	observer.observe(dialog, {
		attributeFilter: ['style']
	});
});
