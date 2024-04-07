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

	if (searchInputElement.value.length === 0 || searchInputElement.value.endsWith(' ')) {
		searchInputElement.value += elem.dataset.tag;
	} else {
		searchInputElement.value += ' ' + elem.dataset.tag;
	}

	searchInputElement.focus();
};

const makeSearchIconElement = () => {
	const elem = document.createElement('i');

	elem.classList.add('fa', 'fa-search', 'fa-lg');

	elem.style.fontSize = '1.1em';

	return elem;
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
