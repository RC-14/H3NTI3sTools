import { qsa } from '/src/lib/utils';

// Prevent triggering other event listeners and redirects
const noImageClickListener = (event: MouseEvent) => {
	event.stopImmediatePropagation();
	event.preventDefault();
};

export const noImageClick = () => {
	const imgElements = Array.from(qsa<HTMLImageElement>('.post__files > .post__thumbnail > a.fileThumb.image-link > img[data-src]'));

	for (const imgElement of imgElements) {
		imgElement.addEventListener('click', noImageClickListener, { capture: true });
	}
};
