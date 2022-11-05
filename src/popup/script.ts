import { qs, qsa, useTemplate } from '../utils.js';

const tabList = [
	{ name: 'Pixiv Viewer', path: 'pixivViewer' },
];

const mainFrame = qs<HTMLIFrameElement>('main > iframe');
const navbar = qs<HTMLUListElement>('ul#navbar');
const navbarItemTemplate = qs<HTMLTemplateElement>('template#navbar-item-template');

if (mainFrame == null) {
	throw new Error('[popup] main frame not found');
} else if (navbar == null) {
	throw new Error('[popup] navbar not found');
} else if (navbarItemTemplate == null) {
	throw new Error('[popup] navbar-item-template not found');
}

navbar.addEventListener('click', (event) => {
	if (!(event.target instanceof HTMLLIElement)) return;

	const prevSelected = qs('.navbar-item.selected');
	if (prevSelected) prevSelected.classList.remove('selected');

	event.target.classList.add('selected');

	const path = event.target.dataset.path;
	if (path == null) return;
	mainFrame.src = chrome.runtime.getURL(`popup/${path}/index.html`);
});

for (const tab of tabList) {
	const navbarItem = useTemplate(navbarItemTemplate);
	if (!(navbarItem instanceof HTMLLIElement)) throw new Error("Navbar item isn't an LI element.");

	navbarItem.dataset.path = tab.path;
	navbarItem.textContent = tab.name;
	navbar.appendChild(navbarItem);
}

qs<HTMLLIElement>('.navbar-item', navbar)?.click();
