const DARK_MODE_CLASS = 'dark';

const enableDarkMode = () => {
	if (!document.documentElement.classList.contains(DARK_MODE_CLASS)) document.documentElement.classList.add(DARK_MODE_CLASS);
};
enableDarkMode();

// Make sure it doesn't get turned off
const observer = new MutationObserver(enableDarkMode);
observer.observe(document.documentElement, {
	attributeFilter: ['class'],
});
