import { qsa } from '../../utils';
import type { MediaTypeHandler } from '/src/lib/viewer';

let setProgress: ((progress?: number) => void) | undefined = undefined;

const addSrcToImg = async (img: HTMLImageElement, source: string, getSrcForSource: (source: string) => Promise<string>) => {
	img.classList.add('loading');

	img.src = await getSrcForSource(source);

	img.classList.remove('loading');
};

const waitForImages = async (contentContainer: HTMLDivElement) => {
	const images = Array.from(qsa<HTMLImageElement>('img', contentContainer));

	const decodePromises: Promise<void>[] = [];

	for (const img of images) {
		// A really disgusting "sleep()" as long as the image doesn't have a source
		while (img.src.length === 0) {
			await new Promise<void>((resolve, reject) => setTimeout(resolve, 50));
		}

		decodePromises.push(img.decode());
	}

	await Promise.allSettled(decodePromises);
};

const scrollHandler = (event: Event) => {
	if (setProgress === undefined) return;
	setProgress(window.scrollY);
};

const returnFalse = () => false;

const defaultExport: MediaTypeHandler = {
	addContentToContentContainer: async (media, contentContainer, getSrcForSource) => {
		for (const source of media.sources) {
			const img = document.createElement('img');
			contentContainer.append(img);

			addSrcToImg(img, source, getSrcForSource);
		}
	},
	preload: (media, contentContainer, direction) => undefined,
	presentMedia: async (media, contentContainer, direction, addKeybind, setProgressFunc, progress) => {
		setProgress = setProgressFunc;

		addKeybind('Space', returnFalse);

		if (progress !== undefined) {
			await waitForImages(contentContainer);

			window.scrollTo({ top: progress, behavior: 'instant' });
		}

		window.addEventListener('scroll', scrollHandler);
	},
	hideMedia: (media, contentContainer, direction, removeKeybind) => {
		window.removeEventListener('scroll', scrollHandler);

		removeKeybind('Space', returnFalse);

		setProgress = undefined;
	},
	autoProgressHandler: (media, contentContainer, direction) => false
};

export default defaultExport;
