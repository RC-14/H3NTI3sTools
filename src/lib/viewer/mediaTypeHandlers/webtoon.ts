import { MediaTypeHandler } from '/src/lib/viewer';

const defaultExport: MediaTypeHandler = {
	addContentToContentContainer: async (media, contentContainer, getSrcForSource) => {
		for (const source of media.sources) {
			const src = await getSrcForSource(source);

			const img = document.createElement('img');
			img.src = src;
			contentContainer.append(img);
		}
	},
	preload: (media, contentContainer, direction) => undefined,
	presentMedia: (media, contentContainer, direction) => undefined,
	hideMedia: (media, contentContainer, direction) => undefined,
	presentationControlHandler: (media, contentContainer, event) => true
};

export default defaultExport;
