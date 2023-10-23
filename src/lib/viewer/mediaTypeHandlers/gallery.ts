import { HIDDEN_CLASS, hideElement, showElement } from '../../pageUtils';
import { qs } from '../../utils';
import type { Media, MediaTypeHandler } from '/src/lib/viewer';

let setProgress: ((progress?: number) => void) | undefined;

const addSrcToImg = async (img: HTMLImageElement, source: string, getSrcForSource: (source: string) => Promise<string>) => {
	img.classList.add('loading');

	img.src = await getSrcForSource(source);

	img.classList.remove('loading');
};

const setIndex = (contentContainer: HTMLDivElement, index: number) => {
	if (isNaN(index)) throw new Error(`Index is NaN.`);
	if (index < 0) throw new Error(`Index is negative.`);

	contentContainer.dataset.index = `${index}`;

	if (setProgress !== undefined) setProgress(index);
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

	if (img.src.length > 0) img.decode();
};

const preloadNext = (sources: Media['sources'], contentContainer: HTMLDivElement) => {
	let i = getIndex(contentContainer);
	if (isNaN(i)) i = -1;

	if (i + 1 === sources.length) return;

	const source = sources[i + 1]!;

	preload(source, contentContainer);
};

const preloadPrevious = (sources: Media['sources'], contentContainer: HTMLDivElement) => {
	let i = getIndex(contentContainer);
	if (isNaN(i)) i = sources.length;

	if (i - 1 === -1) return;

	const source = sources[i - 1]!;

	preload(source, contentContainer);
};

const show = (sources: Media['sources'], contentContainer: HTMLDivElement, index: number) => {
	if (index < 0 || index >= sources.length) throw new Error(`Index is out of range for gallery (${sources.length - 1}): ${index}`);

	const source = sources[index];

	const img = qs<HTMLImageElement>(`img[data-source="${source}"]`, contentContainer);
	if (!(img instanceof HTMLImageElement)) throw new Error(`Didn't find an image element for the first source (${source}).`);

	showElement(img);

	setIndex(contentContainer, index);
	preloadPrevious(sources, contentContainer);
	preloadNext(sources, contentContainer);
	updateCounter(contentContainer);
};

const showNext = (media: Media, contentContainer: HTMLDivElement) => {
	const previousIndex = getIndex(contentContainer);
	const nextIndex = previousIndex + 1;
	if (nextIndex === media.sources.length) return true;

	const previousSource = media.sources[previousIndex];
	const previousImg = qs<HTMLImageElement>(`img[data-source="${previousSource}"]`, contentContainer);
	if (!(previousImg instanceof HTMLImageElement)) throw new Error(`Didn't find an image element for the previous source (${previousSource}).`);
	hideElement(previousImg);

	const nextSource = media.sources[nextIndex];
	const nextImg = qs<HTMLImageElement>(`img[data-source="${nextSource}"]`, contentContainer);
	if (!(nextImg instanceof HTMLImageElement)) throw new Error(`Didn't find an image element for the next source (${nextSource}).`);
	showElement(nextImg);

	setIndex(contentContainer, nextIndex);
	preloadNext(media.sources, contentContainer);
	updateCounter(contentContainer);

	return false;
};

const showPrevious = (media: Media, contentContainer: HTMLDivElement) => {
	const previousIndex = getIndex(contentContainer);
	if (previousIndex === 0) return true;

	const nextIndex = previousIndex - 1;

	const previousSource = media.sources[previousIndex];
	const previousImg = qs<HTMLImageElement>(`img[data-source="${previousSource}"]`, contentContainer);
	if (!(previousImg instanceof HTMLImageElement)) throw new Error(`Didn't find an image element for the previous source (${previousSource}).`);
	hideElement(previousImg);

	const nextSource = media.sources[nextIndex];
	const nextImg = qs<HTMLImageElement>(`img[data-source="${nextSource}"]`, contentContainer);
	if (!(nextImg instanceof HTMLImageElement)) throw new Error(`Didn't find an image element for the next source (${nextSource}).`);
	showElement(nextImg);

	setIndex(contentContainer, nextIndex);
	preloadPrevious(media.sources, contentContainer);
	updateCounter(contentContainer);

	return false;
};

const showFirst = (media: Media, contentContainer: HTMLDivElement) => {
	const previousIndex = getIndex(contentContainer);
	if (previousIndex === 0) return false;

	const previousSource = media.sources[previousIndex];
	const previousImg = qs<HTMLImageElement>(`img[data-source="${previousSource}"]`, contentContainer);
	if (!(previousImg instanceof HTMLImageElement)) throw new Error(`Didn't find an image element for the previous source (${previousSource}).`);
	hideElement(previousImg);

	const firstSource = media.sources[0];
	const firstImg = qs<HTMLImageElement>(`img[data-source="${firstSource}"]`, contentContainer);
	if (!(firstImg instanceof HTMLImageElement)) throw new Error(`Didn't find an image element for the first source (${firstSource}).`);
	showElement(firstImg);

	setIndex(contentContainer, 0);
	preloadPrevious(media.sources, contentContainer);
	updateCounter(contentContainer);

	return false;
};

const showLast = (media: Media, contentContainer: HTMLDivElement) => {
	const previousIndex = getIndex(contentContainer);
	if (previousIndex === media.sources.length - 1) return false;

	const previousSource = media.sources[previousIndex];
	const previousImg = qs<HTMLImageElement>(`img[data-source="${previousSource}"]`, contentContainer);
	if (!(previousImg instanceof HTMLImageElement)) throw new Error(`Didn't find an image element for the previous source (${previousSource}).`);
	hideElement(previousImg);

	const lastSource = media.sources[media.sources.length - 1];
	const lastImg = qs<HTMLImageElement>(`img[data-source="${lastSource}"]`, contentContainer);
	if (!(lastImg instanceof HTMLImageElement)) throw new Error(`Didn't find an image element for the last source (${lastSource}).`);
	showElement(lastImg);

	setIndex(contentContainer, media.sources.length - 1);
	preloadPrevious(media.sources, contentContainer);
	updateCounter(contentContainer);

	return false;
};

const defaultExport: MediaTypeHandler = {
	addContentToContentContainer: async (media, contentContainer, getSrcForSource) => {
		for (const source of media.sources) {
			// Don't add images twice.
			if (qs<HTMLImageElement>(`img[data-source="${source}"]`, contentContainer) !== null) continue;

			const img = document.createElement('img');
			img.dataset.source = source;
			hideElement(img);
			contentContainer.append(img);

			addSrcToImg(img, source, getSrcForSource);
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
	presentMedia: (media, contentContainer, direction, addKeybind, setProgressFunc, progress) => {
		setProgress = setProgressFunc;

		addKeybind('ArrowRight', showNext);
		addKeybind('Space', showNext);

		addKeybind('ArrowLeft', showPrevious);
		addKeybind({ key: 'Space', shift: true }, showPrevious);

		addKeybind('ArrowDown', showFirst);

		addKeybind('ArrowUp', showLast);

		if (progress !== undefined) {
			show(media.sources, contentContainer, progress);
			return;
		}

		show(media.sources, contentContainer, 0);
		// switch (direction) {
		// 	case 'backward':
		// 		show(media.sources, contentContainer, media.sources.length - 1);
		// 		break;

		// 	case 'forward':
		// 		show(media.sources, contentContainer, 0);
		// 		break;
		// }
	},
	hideMedia: (media, contentContainer, direction, removeKeybind) => {
		hideElement(qs<HTMLImageElement>(`img:not(.${HIDDEN_CLASS})`, contentContainer)!);

		delete contentContainer.dataset.index;

		removeKeybind('ArrowRight', showNext);
		removeKeybind('Space', showNext);

		removeKeybind('ArrowLeft', showPrevious);
		removeKeybind({ key: 'Space', shift: true }, showPrevious);

		removeKeybind('ArrowDown', showFirst);

		removeKeybind('ArrowUp', showLast);

		setProgress = undefined;
	},
	autoProgressHandler: (media, contentContainer, direction) => {
		if (direction === 'backward') {
			return showPrevious(media, contentContainer);
		}
		return showNext(media, contentContainer);
	},
};

export default defaultExport;
