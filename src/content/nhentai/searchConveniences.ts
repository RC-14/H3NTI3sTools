import { qs } from '/src/lib/utils';

let searchInputElement: HTMLInputElement;
let ranInit = false;

const init = () => {
	if (ranInit) return;

	let tmp: unknown;
	tmp = qs<HTMLInputElement>('.search > input');
	if (!(tmp instanceof HTMLInputElement)) throw new Error("Couldn't find the search input element.");
	searchInputElement = tmp;

	ranInit = true;
};

const buttonClickHandler = (event: MouseEvent) => {
	event.preventDefault();

	const elem = event.currentTarget;
	if (!(elem instanceof HTMLButtonElement)) throw new Error('event.currentTarget is not a button element.');
	if (elem.dataset.tag === undefined) throw new Error("The data-tag attribute of the button isn't set");

	if (searchInputElement.value.includes(elem.dataset.tag)) {
		// Don't add it if it's already there
	} else if (searchInputElement.value.length === 0 || searchInputElement.value.endsWith(' ')) {
		searchInputElement.value += elem.dataset.tag;
	} else {
		searchInputElement.value += ' ' + elem.dataset.tag;
	}

	searchInputElement.focus();
};

const makeButtonElement = (tag: string, child: string | Node, { classes, style }: { classes?: string[]; style?: Partial<Omit<CSSStyleDeclaration, 'length' | 'parentRule' | 'getPropertyPriority' | 'getPropertyValue' | 'item' | 'removeProperty' | 'setProperty' | number>>; } = {}) => {
	const elem = document.createElement('button');

	if (classes !== undefined) {
		elem.classList.add(...classes);
	}

	if (style !== undefined) {
		Object.assign(elem.style, style);
	}

	elem.dataset.tag = tag;

	elem.addEventListener('click', buttonClickHandler);

	elem.append(child);

	return elem;
};

const makeSearchIconElement = () => {
	const elem = document.createElement('i');

	elem.classList.add('fa', 'fa-search', 'fa-lg');

	elem.style.fontSize = '1.1em';

	return elem;
};

export const addUseInSearchButton = () => {
	init();

	const containerElement = qs<HTMLHeadingElement>('#content > h1');
	if (!(containerElement instanceof HTMLHeadingElement)) throw new Error("Couldn't find the container to attach the search button to.");

	const tagNameElement = qs<HTMLSpanElement>('span.name', containerElement);
	if (!(tagNameElement instanceof HTMLSpanElement)) throw new Error("Couldn't find the tag name element.");

	containerElement.append(makeButtonElement(
		`${location.pathname.split('/')[1]!}:"${tagNameElement.innerText}"`, // tagType:"tagName"
		makeSearchIconElement(),
		{
			classes: ['btn', 'btn-secondary', 'btn-square'],
			style: {
				display: 'inline-flex',
				justifyContent: 'center',
				alignItems: 'center'
			}
		}
	));
};

const makeEnglishFlagElement = () => {
	const elem = document.createElement('img');

	// english flag used by nhentai
	elem.src = 'data:image/gif;base64,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';

	elem.style.height = '100%';
	elem.style.width = '100%';

	return elem;
};

const makeRainbowGradientElement = () => {
	const elem = document.createElement('div');

	elem.style.height = '100%';
	elem.style.width = '100%';
	elem.style.content = 'conic-gradient(from 90deg, violet, indigo, blue, green, yellow, orange, red, violet)';

	return elem;
};

export const addEnglishAndFullColorButtons = () => {
	init();

	const container = document.createElement('div');

	container.style.display = 'inline-flex';
	container.style.flexDirection = 'column';
	container.style.justifyContent = 'space-around';
	container.style.alignItems = 'center';
	container.style.width = '27.5px';
	container.style.height = '40px';
	container.style.marginRight = '-30px';
	container.style.position = 'relative';
	container.style.top = '-6.25px';

	container.append(
		makeButtonElement(
			'language:"english"',
			makeEnglishFlagElement(),
			{
				style: {
					width: '22.5px',
					height: '15',
					margin: '0px',
					border: 'none',
					padding: '0px',
					borderRadius: '3px',
					overflow: 'hidden'
				}
			}
		),
		makeButtonElement(
			'tag:"full color"',
			makeRainbowGradientElement(),
			{
				style: {
					width: '22.5px',
					height: '15',
					margin: '0px',
					border: 'none',
					padding: '0px',
					borderRadius: '3px',
					overflow: 'hidden'
				}
			}
		)
	);


	searchInputElement.style.paddingLeft = '30px';
	searchInputElement.parentElement!.insertBefore(container, searchInputElement);
};
