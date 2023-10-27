import { qs } from '/src/lib/utils';

const DARK_MODE_CLASS = 'dark';

const enableDarkMode = () => {
	if (!document.documentElement.classList.contains(DARK_MODE_CLASS)) document.documentElement.classList.add(DARK_MODE_CLASS);
};
enableDarkMode();

// Make sure it doesn't get turned off
const documentObserver = new MutationObserver(enableDarkMode);
documentObserver.observe(document.documentElement, {
	attributeFilter: ['class'],
});

// Automatically check the remember me checkbox in case I need to log in again.
const rememberMeCheckbox = qs<HTMLInputElement>('input[type="checkbox"][data-v-55ca7f47]');
if (rememberMeCheckbox?.checked === false) {
	const dialog = qs('div[role="dialog"]');
	if (!dialog) throw new Error(`Couldn't find a dialog to check remember me in.`);

	const dialogObserver = new MutationObserver((mutations, observer) => {
		// The proper styling for the checkbox only gets applied on click
		rememberMeCheckbox.click();

		// Only needed once
		observer.disconnect();
	});

	dialogObserver.observe(dialog, {
		attributeFilter: ['style']
	});
}
