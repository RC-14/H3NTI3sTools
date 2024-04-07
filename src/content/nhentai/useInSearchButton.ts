import { qs } from '/src/lib/utils';

let searchInputElement: HTMLInputElement;
let containerElement: HTMLHeadingElement;
let tagNameElement: HTMLSpanElement;
let ranInit = false;

const init = () => {
	if (ranInit) return;

	let tmp: unknown;
	tmp = qs<HTMLInputElement>('.search > input');
	if (!(tmp instanceof HTMLInputElement)) throw new Error("Couldn't find the search input element.");
	searchInputElement = tmp;

	tmp = qs<HTMLHeadingElement>('#content > h1');
	if (!(tmp instanceof HTMLHeadingElement)) throw new Error("Couldn't find the container to attach the search button to.");
	containerElement = tmp;

	tmp = qs<HTMLSpanElement>('span.name', containerElement);
	if (!(tmp instanceof HTMLSpanElement)) throw new Error("Couldn't find the tag name element.");
	tagNameElement = tmp;

	ranInit = true;
};

const makeSearchIconElement = () => {
	const elem = document.createElement('i');

	elem.classList.add('fa', 'fa-search', 'fa-lg');

	elem.style.fontSize = '1.1em';

	return elem;
};

const buttonClickHandler = () => {
	let tag = location.pathname.split('/')[1]!;
	tag += ':"';
	tag += tagNameElement.innerText;
	tag += '"';

	if (searchInputElement.value.length !== 0 && !searchInputElement.value.endsWith(' ')) {
		tag = ' ' + tag;
	}

	searchInputElement.value += tag;

	searchInputElement.focus();
};

const makeButtonElement = () => {
	const elem = document.createElement('button');

	elem.classList.add('btn', 'btn-secondary', 'btn-square');

	elem.style.display = 'inline-flex';
	elem.style.justifyContent = 'center';
	elem.style.alignItems = 'center';

	elem.addEventListener('click', buttonClickHandler, { passive: true });

	elem.append(makeSearchIconElement());

	return elem;
};

const addUseInSearchButtonToContainer = () => {
	init();

	containerElement.append(makeButtonElement());
};

export default addUseInSearchButtonToContainer;
