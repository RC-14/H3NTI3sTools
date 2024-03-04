import StorageHelper from '/src/lib/StorageHelper';
import { qs, qsa, useTemplate } from '/src/lib/utils';
import { AliasStorageSchema, type AliasCategory, type AliasStorage } from '/src/lib/viewer';
import '../../../lib/devToolHelpers';

const categoryButtonsArea = qs<HTMLDivElement>('div#category-buttons-area');
const categoryButtonTemplate = qs<HTMLTemplateElement>('template#category-button-template');

const mainElement = qs<HTMLElement>('main');

const newAliasContainer = qs<HTMLDivElement>('div#new-alias-container');
const newAliasInput = qs<HTMLInputElement>('input#new-alias-input');
const newAliasButton = qs<HTMLButtonElement>('button#new-alias-button');

const categoryContainersWrapper = qs<HTMLDivElement>('div#category-containers-wrapper');
const categoryContainerTemplate = qs<HTMLTemplateElement>('template#category-container-template');
const aliasContainerTemplate = qs<HTMLTemplateElement>('template#alias-container-template');
const aliasListEntryCotainerTemplate = qs<HTMLTemplateElement>('template#alias-list-entry-container-template');

const saveButton = qs<HTMLButtonElement>('button#save-button');

if (!(
	categoryButtonsArea &&
	categoryButtonTemplate &&
	mainElement &&
	newAliasContainer &&
	newAliasInput &&
	newAliasButton &&
	categoryContainersWrapper &&
	categoryContainerTemplate &&
	aliasContainerTemplate &&
	aliasListEntryCotainerTemplate &&
	saveButton
)) throw new Error("An essential element couldn't be found.");

const CATEGORY_NAMES = [
	'creators',
	'tags'
] as const;

const storage = new StorageHelper('local', 'viewer');

let aliasStorageMirror: AliasStorage;

const createCategoryButton = (categoryName: string) => {
	const categoryButton = useTemplate(categoryButtonTemplate);
	if (!(categoryButton instanceof HTMLButtonElement)) throw new Error(`The categoryButton template is corrupted.`);

	categoryButton.dataset.categoryName = categoryName;
	categoryButton.innerText = categoryName.charAt(0).toUpperCase() + categoryName.substring(1);

	return categoryButton;
};

const createAliasListEntry = (aliasListEntry: AliasCategory[string][number]) => {
	const aliasListEntryContainer = useTemplate(aliasListEntryCotainerTemplate);
	if (!(aliasListEntryContainer instanceof HTMLLIElement)) throw new Error('The aliasListEntryContainer template is corrupted.');

	const aliasListEntryElement = qs<HTMLParagraphElement>('p.alias-list-entry', aliasListEntryContainer);
	if (!aliasListEntryElement) throw new Error('The aliasListEntryContainer template is missing the aliasListEntry element.');

	aliasListEntryElement.innerText = aliasListEntry;

	return aliasListEntryContainer;
};

const createAliasContainer = (categoryName: keyof AliasStorage, aliasName: keyof AliasCategory) => {
	const aliasContainer = useTemplate(aliasContainerTemplate);
	if (!(aliasContainer instanceof HTMLLIElement)) throw new Error('The aliasContainer template is corrupted.');

	const aliasNameElement = qs<HTMLParagraphElement>('p.alias-name', aliasContainer);
	const aliasListElement = qs<HTMLOListElement>('ol.alias-list', aliasContainer);
	if (!(
		aliasNameElement &&
		aliasListElement
	)) throw new Error('The aliasContainer template is missing children.');

	aliasNameElement.innerText = aliasName;

	if (aliasStorageMirror[categoryName] === undefined || !(aliasName in aliasStorageMirror[categoryName]!)) return aliasContainer;

	const aliasListEntries = aliasStorageMirror[categoryName]![aliasName]!;
	aliasListElement.append(...aliasListEntries.map(createAliasListEntry));

	return aliasContainer;
};

const createCategoryContainer = (categoryName: string) => {
	const categoryContainer = useTemplate(categoryContainerTemplate);
	if (!(categoryContainer instanceof HTMLOListElement)) throw new Error(`The categoryContainer template is corrupted.`);

	categoryContainer.dataset.categoryName = categoryName;
	if (!(categoryName in aliasStorageMirror)) return categoryContainer;

	const aliasNames = Object.keys(aliasStorageMirror[categoryName]!);
	categoryContainer.append(...aliasNames.map((aliasName) => createAliasContainer(categoryName, aliasName)));

	return categoryContainer;
};

type ClassNameToHandlerMap<T> = {
	[key: string]: (event: T) => void;
};

categoryButtonsArea.addEventListener('click', (event) => {
	if (!(event.target instanceof HTMLButtonElement)) return;

	qsa('.active').forEach((element) => void element.classList.remove('active'));

	event.target.classList.add('active');

	const categoryName = event.target.dataset.categoryName ?? '';

	const categoryContainer = qs<HTMLOListElement>(`ol.category-container[data-category-name="${categoryName}"]`, categoryContainersWrapper);
	if (!categoryContainer) throw new Error(`Couldn't find a categoryContainer for category: ${categoryName}`);

	categoryContainer.classList.add('active');
});

newAliasInput.addEventListener('keypress', (event) => {
	if (event.code !== 'Enter') return;

	newAliasButton.click();
});
newAliasButton.addEventListener('click', (event) => {
	const aliasName = newAliasInput.value.trim();
	if (!aliasName) return;

	const activeCategoyContainer = qs<HTMLOListElement>('ol.category-container.active');
	if (!activeCategoyContainer) throw new Error("Couldn't find an active categoryContainer");

	const categoryName = activeCategoyContainer.dataset.categoryName;
	if (!categoryName) throw new Error("Active categoryContainer doesn't have a categoryName set.");

	activeCategoyContainer.prepend(createAliasContainer(categoryName, aliasName));

	newAliasInput.value = '';
});

const categoryContainerEventHandlers: {
	click: ClassNameToHandlerMap<MouseEvent>;
	keypress: ClassNameToHandlerMap<KeyboardEvent>;
} = {
	click: {
		'alias-new-entry-button': (event) => {
			const button = event.target;
			if (!(button instanceof HTMLButtonElement)) throw new Error("event.target isn't a button element.");

			const inputElement = button.previousElementSibling;
			if (!(inputElement instanceof HTMLInputElement)) throw new Error("event.target.previousElementSibling isn't an input element.");

			const aliasListElement = button.parentElement?.nextElementSibling;
			if (!(aliasListElement instanceof HTMLOListElement)) throw new Error("Couldn't find event.target.parentElement.nextElementSibling or it's not an ol element.");

			if (!inputElement.value.trim()) return;

			aliasListElement.prepend(createAliasListEntry(inputElement.value));
		},
		'alias-list-entry-remove-button': (event) => void (event.target as HTMLElement).parentElement!.remove()
	},
	keypress: {
		// 'alias-name': (event) => { },
		'alias-new-entry-input': (event) => {
			if (event.code !== 'Enter') return;

			const inputElement = event.target;
			if (!(inputElement instanceof HTMLInputElement)) throw new Error("event.target isn't an input element.");

			const buttonElement = inputElement.nextElementSibling;
			if (!(buttonElement instanceof HTMLButtonElement)) throw new Error("event.target.nextElementSibling isn't a button element.");

			buttonElement.click();
		},
		// 'alias-list-entry': (event) => { }
	}
};

categoryContainersWrapper.addEventListener('click', (event) => {
	if (!(event.target instanceof HTMLElement)) return;

	if (event.target.className in categoryContainerEventHandlers.click) {
		categoryContainerEventHandlers.click[event.target.className]!(event);
	}
});

categoryContainersWrapper.addEventListener('keypress', (event) => {
	if (!(event.target instanceof HTMLElement)) return;

	if (event.target.className in categoryContainerEventHandlers.keypress) {
		categoryContainerEventHandlers.keypress[event.target.className]!(event);
	}
});

saveButton.addEventListener('click', (event) => {
	aliasStorageMirror = {};

	const categoryContainers = qsa<HTMLOListElement>('ol.category-container', categoryContainersWrapper);

	for (const container of categoryContainers) {
		const categoryName = container.dataset.categoryName;
		if (!categoryName) throw new Error("categoryContainer doesn't have a categoryName set.");

		const aliasContainers = qsa<HTMLLIElement>('li.alias-container', container);

		if (aliasContainers.length === 0) continue;

		const aliases: AliasCategory = {};

		for (const aliasContainer of aliasContainers) {
			const aliasNameElement = qs<HTMLParagraphElement>('p.alias-name', aliasContainer);
			if (!(aliasNameElement instanceof HTMLParagraphElement)) throw new Error("aliasNameElement isn't a p element.");

			const aliasName = aliasNameElement.innerText.trim();
			if (!aliasName) continue;

			const aliasListElement = qs<HTMLOListElement>('ol.alias-list', aliasContainer);
			if (!(aliasListElement instanceof HTMLOListElement)) throw new Error("aliasListElement isn't a ol element.");

			if (aliasListElement.childElementCount === 0) continue;

			const aliasListEntries = new Set<AliasCategory[string][number]>();

			for (const aliasListEntryContainer of aliasListElement.children) {
				const aliasListEntryElement = aliasListEntryContainer.firstElementChild;
				if (!(aliasListEntryElement instanceof HTMLParagraphElement)) throw new Error("aliasListEntryElement isn't a p element.");

				const aliasListEntry = aliasListEntryElement.innerText.trim();
				if (!aliasListEntry) continue;
				aliasListEntries.add(aliasListEntry);
			}

			if (aliasListEntries.size === 0) continue;

			if (aliasName in aliases) {
				for (const entry of aliases[aliasName]!) aliasListEntries.add(entry);
			}
			aliases[aliasName] = [...aliasListEntries].sort();
		}

		if (Object.keys(aliases).length === 0) continue;

		aliasStorageMirror[categoryName] = aliases;
	}

	storage.set('aliases', AliasStorageSchema.parse(aliasStorageMirror));
});

storage.get('aliases').then((aliasStorage) => {
	aliasStorageMirror = AliasStorageSchema.parse(aliasStorage ?? {});

	for (const categoryName of CATEGORY_NAMES) {
		categoryButtonsArea.append(createCategoryButton(categoryName));
		categoryContainersWrapper.append(createCategoryContainer(categoryName));
	}

	qs<HTMLButtonElement>('button.category-button', categoryButtonsArea)?.click();
	mainElement.hidden = false;
});
