import { HIDDEN_CLASS, hideElement, showElement } from '../../pageUtils';
import { qs } from '../../utils';
import { Media, MediaTypeHandler } from '/src/lib/viewer';

const setIndex = (contentContainer: HTMLDivElement, index: number) => {
	if (isNaN(index)) throw new Error(`Index is NaN.`);
	if (index < 0) throw new Error(`Index is negative.`);

	contentContainer.dataset.index = `${index}`;
};

const getIndex = (contentContainer: HTMLDivElement) => {
	return parseInt(contentContainer.dataset.index ?? 'NaN');
};

const updateCounter = (contentContainer: HTMLDivElement) => {
	const counter = qs<HTMLParagraphElement>('p.content-counter', contentContainer)!;
	counter.innerText = `${getIndex(contentContainer) + 1}/${contentContainer.childElementCount - 1}`;
};

const preload = (source: Media['sources'][number], contentContainer: HTMLDivElement) => {
	const img = qs<HTMLImageElement>(`img[data-source="${source}"]`, contentContainer);
	if (!(img instanceof HTMLImageElement)) throw new Error(`Didn't find an image to preload for source: ${source}`);

	img.decode();
};

const preloadNext = (sources: Media['sources'], contentContainer: HTMLDivElement) => {
	let i = getIndex(contentContainer);
	if (isNaN(i)) i = -1;

	if (i + 1 === sources.length) return;

	const source = sources[i + 1];

	preload(source, contentContainer);
};

const preloadPrevious = (sources: Media['sources'], contentContainer: HTMLDivElement) => {
	let i = getIndex(contentContainer);
	if (isNaN(i)) i = sources.length;

	if (i - 1 === -1) return;

	const source = sources[i - 1];

	preload(source, contentContainer);
};

const showFirst = (sources: Media['sources'], contentContainer: HTMLDivElement) => {
	const source = sources[0];

	const img = qs<HTMLImageElement>(`img[data-source="${source}"]`, contentContainer);
	if (!(img instanceof HTMLImageElement)) throw new Error(`Didn't find an image element for the first source (${source}).`);

	showElement(img);

	setIndex(contentContainer, 0);
	preloadNext(sources, contentContainer);
	updateCounter(contentContainer);
};

const showLast = (sources: Media['sources'], contentContainer: HTMLDivElement) => {
	const source = sources.at(-1);

	const img = qs<HTMLImageElement>(`[data-source="${source}"]`, contentContainer);
	if (!(img instanceof HTMLImageElement)) throw new Error(`Didn't find an image element for the last source (${source}).`);

	showElement(img);

	setIndex(contentContainer, sources.length - 1);
	preloadPrevious(sources, contentContainer);
	updateCounter(contentContainer);
};

const showNext = (sources: Media['sources'], contentContainer: HTMLDivElement) => {
	const previousIndex = getIndex(contentContainer);
	const nextIndex = previousIndex + 1;
	if (nextIndex === sources.length) return true;

	const previousSource = sources[previousIndex];
	const previousImg = qs<HTMLImageElement>(`img[data-source="${previousSource}"]`);
	if (!(previousImg instanceof HTMLImageElement)) throw new Error(`Didn't find an image element for the previous source (${previousSource}).`);
	hideElement(previousImg);

	const nextSource = sources[nextIndex];
	const nextImg = qs<HTMLImageElement>(`img[data-source="${nextSource}"]`);
	if (!(nextImg instanceof HTMLImageElement)) throw new Error(`Didn't find an image element for the next source (${nextSource}).`);
	showElement(nextImg);

	setIndex(contentContainer, nextIndex);
	preloadNext(sources, contentContainer);
	updateCounter(contentContainer);

	return false;
};

const showPrevious = (sources: Media['sources'], contentContainer: HTMLDivElement) => {
	const previousIndex = getIndex(contentContainer);
	const nextIndex = previousIndex - 1;
	if (previousIndex === 0) return true;

	const previousSource = sources[previousIndex];
	const previousImg = qs<HTMLImageElement>(`img[data-source="${previousSource}"]`);
	if (!(previousImg instanceof HTMLImageElement)) throw new Error(`Didn't find an image element for the previous source (${previousSource}).`);
	hideElement(previousImg);

	const nextSource = sources[nextIndex];
	const nextImg = qs<HTMLImageElement>(`img[data-source="${nextSource}"]`);
	if (!(nextImg instanceof HTMLImageElement)) throw new Error(`Didn't find an image element for the next source (${nextSource}).`);
	showElement(nextImg);

	setIndex(contentContainer, nextIndex);
	preloadPrevious(sources, contentContainer);
	updateCounter(contentContainer);

	return false;
};

const defaultExport: MediaTypeHandler = {
	addContentToContentContainer: async (media, contentContainer, getSrcForSource) => {
		for (const source of media.sources) {
			// Don't add images twice.
			if (qs<HTMLImageElement>(`img[data-source="${source}"]`, contentContainer) !== null) continue;

			const src = await getSrcForSource(source);

			const img = document.createElement('img');
			img.dataset.source = source;
			img.src = src;
			hideElement(img);
			contentContainer.append(img);
		}

		const pageCounter = document.createElement('p');
		pageCounter.classList.add('content-counter');
		contentContainer.append(pageCounter);
	},
	preload: (media, contentContainer, direction) => {
		switch (direction) {
			case 'backward':
				preloadPrevious(media.sources, contentContainer);
				break;

			case 'forward':
				preloadNext(media.sources, contentContainer);
				break;
		}
	},
	presentMedia: (media, contentContainer, direction) => {
		switch (direction) {
			case 'backward':
				showLast(media.sources, contentContainer);
				break;

			case 'forward':
				showFirst(media.sources, contentContainer);
				break;
		}
	},
	hideMedia: (media, contentContainer, direction) => {
		hideElement(qs<HTMLImageElement>(`img:not(.${HIDDEN_CLASS})`)!);

		delete contentContainer.dataset.index;
	},
	presentationControlHandler: (media, contentContainer, event) => {
		switch (event.code) {
			case 'Space':
				if (event.shiftKey) {
					return showPrevious(media.sources, contentContainer);
				}
				return showNext(media.sources, contentContainer);

			case 'ArrowLeft':
				return showPrevious(media.sources, contentContainer);

			case 'ArrowRight':
				return showNext(media.sources, contentContainer);
		}

		return true;
	}
};

export default defaultExport;
