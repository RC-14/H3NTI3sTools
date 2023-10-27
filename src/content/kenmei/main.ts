import { qs } from '/src/lib/utils';

const DARK_MODE_CLASS = 'dark'

const enableDarkMode = () => {
	if (!document.documentElement.classList.contains(DARK_MODE_CLASS)) document.documentElement.classList.add(DARK_MODE_CLASS);
};
enableDarkMode();

// Make sure it doesn't get turned off
const observer = new MutationObserver(enableDarkMode);
observer.observe(document.documentElement, {
	attributeFilter: ['class']
});

// Automatically check the remember me checkbox in case I need to log in again.
const rememberMeCheckbox = qs<HTMLInputElement>('input#checkbox-b9LmWY[type="checkbox"]');
if (rememberMeCheckbox?.checked === false) rememberMeCheckbox.click(); // The proper styling for the checkbox only gets applied on click
