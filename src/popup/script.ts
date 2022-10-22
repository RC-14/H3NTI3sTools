import { qs, qsa, useTemplate } from '../utils.js';

const tabList = [
	{ name: 'Pixiv Viewer', path: 'pixivViewer' },
];

const contentFrame = qs<HTMLIFrameElement>('#content');
const navbar = qs<HTMLUListElement>('#navbar');
const navbarItemTemplate = qs<HTMLTemplateElement>('#navbar-item-template');

if (contentFrame == null) {
	throw new Error('[popup] content not found');
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
	contentFrame.src = chrome.runtime.getURL(`popup/${path}/index.html`);
});

for (const tab of tabList) {
	const navbarItem = useTemplate(navbarItemTemplate) as HTMLLIElement;
	navbarItem.dataset.path = tab.path;
	navbarItem.textContent = tab.name;
	navbar.appendChild(navbarItem);
}

qs<HTMLLIElement>('.navbar-item', navbar)?.click();
