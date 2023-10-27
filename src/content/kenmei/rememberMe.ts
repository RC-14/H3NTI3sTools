import { qs } from '/src/lib/utils';

// Automatically check the remember me checkbox in case I need to log in again.
const rememberMeCheckbox = qs<HTMLInputElement>('input[type="checkbox"][data-v-55ca7f47]');
if (rememberMeCheckbox?.checked === false) {
	const dialog = qs('div[role="dialog"]');
	if (!dialog) throw new Error(`Couldn't find a dialog to check remember me in.`);

	const observer = new MutationObserver((mutations, observer) => {
		// The proper styling for the checkbox only gets applied on click
		rememberMeCheckbox.click();

		// Only needed once
		observer.disconnect();
	});

	observer.observe(dialog, {
		attributeFilter: ['style']
	});
}
