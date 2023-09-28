import { runtime } from 'webextension-polyfill';
import { qs, useTemplate } from '../lib/utils';

const tabList: { name: string, fragmentId: string; }[] = [
	{ fragmentId: 'viewer', name: 'Viewer' },
	{ fragmentId: 'historyRecorder', name: 'History Recorder' }
];

const mainFrame = qs<HTMLIFrameElement>('main > iframe');
const navbar = qs<HTMLUListElement>('ul#navbar');
const navbarItemTemplate = qs<HTMLTemplateElement>('template#navbar-item-template');

if (!(mainFrame && navbar && navbarItemTemplate)) throw new Error("HTML elements not found.");

navbar.addEventListener('click', (event) => {
	if (!(event.target instanceof HTMLLIElement)) return;

	const prevSelected = qs('.navbar-item.selected');
	if (prevSelected) prevSelected.classList.remove('selected');

	event.target.classList.add('selected');

	const fragmentId = event.target.dataset.path;
	if (fragmentId == null) return;
	mainFrame.src = runtime.getURL(`popup/${fragmentId}/index.html`);
});

for (const tab of tabList) {
	const navbarItem = useTemplate(navbarItemTemplate);
	if (!(navbarItem instanceof HTMLLIElement)) throw new Error("Navbar item isn't an LI element.");

	navbarItem.dataset.path = tab.fragmentId;
	navbarItem.textContent = tab.name;
	navbar.appendChild(navbarItem);
}

qs<HTMLLIElement>('.navbar-item', navbar)?.click();
