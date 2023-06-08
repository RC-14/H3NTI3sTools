import { hideElement, HIDDEN_CLASS, showElement } from '../../pageUtils';
import { qs } from '../../utils';
import { Media, MediaTypeHandler } from '/src/lib/viewer';

const updateCounter = (contentContainer: HTMLDivElement) => {
	const counter = qs<HTMLParagraphElement>('p.content-counter', contentContainer)!;
	counter.innerText = `${contentContainer.dataset.index}/${contentContainer.childElementCount - 1}`;
};

const showFirst = (sources: Media['sources'], contentContainer: HTMLDivElement) => {
	const source = sources[0];

	const img = qs<HTMLImageElement>(`img[data-source="${source}"]`, contentContainer);
	if (!(img instanceof HTMLImageElement)) throw new Error(`Didn't find an image element for the first source (${source}).`);

	showElement(img);

	contentContainer.dataset.index = '0';
	updateCounter(contentContainer);
};

const showLast = (sources: Media['sources'], contentContainer: HTMLDivElement) => {
	const source = sources.at(-1);

	const img = qs<HTMLImageElement>(`[data-source="${source}"]`, contentContainer);
	if (!(img instanceof HTMLImageElement)) throw new Error(`Didn't find an image element for the last source (${source}).`);

	showElement(img);

	contentContainer.dataset.index = `${sources.length - 1}`;
	updateCounter(contentContainer);
};

const showNext = (sources: Media['sources'], contentContainer: HTMLDivElement) => {
	const previousIndex = parseInt(contentContainer.dataset.index ?? 'NaN');
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

	contentContainer.dataset.index = `${nextIndex}`;
	updateCounter(contentContainer);

	return false;
};

const showPrevious = (sources: Media['sources'], contentContainer: HTMLDivElement) => {
	const previousIndex = parseInt(contentContainer.dataset.index ?? 'NaN');
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

	contentContainer.dataset.index = `${nextIndex}`;
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
	presentMedia: (media, contentContainer, direction) => {
		if (direction === 'backward') {
			showLast(media.sources, contentContainer);
		} else if (direction === 'forward') {
			showFirst(media.sources, contentContainer);
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
