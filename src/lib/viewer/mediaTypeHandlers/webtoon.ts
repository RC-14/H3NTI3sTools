import { MediaTypeHandler } from '/src/lib/viewer';

const addSrcToImg = async (img: HTMLImageElement, source: string, getSrcForSource: (source: string) => Promise<string>) => {
	img.classList.add('loading');

	img.src = await getSrcForSource(source);

	img.classList.remove('loading')
};

const defaultExport: MediaTypeHandler = {
	addContentToContentContainer: async (media, contentContainer, getSrcForSource) => {
		for (const source of media.sources) {
			const img = document.createElement('img');
			contentContainer.append(img);

			addSrcToImg(img, source, getSrcForSource);
		}
	},
	preload: (media, contentContainer, direction) => undefined,
	presentMedia: (media, contentContainer, direction) => undefined,
	hideMedia: (media, contentContainer, direction) => {
		window.scrollTo({ top: 0, behavior: 'instant' });
	},
	presentationControlHandler: (media, contentContainer, event) => event.code !== 'Space'
};

export default defaultExport;
