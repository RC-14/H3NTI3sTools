import { qsa } from '/src/lib/utils';

/**
 * Loads the images of the "manga" on hiperdex.
 */
export const loadImages = () => {
	const images = Array.from(qsa<HTMLImageElement>('img.wp-manga-chapter-img'));

	const imageSrcs: string[] = [];

	for (let i = 0; i < images.length; i++) {
		const image = images[i];
		const src = image.dataset.src?.trim();

		delete image.dataset.src;
		image.classList.remove('img-responsive', 'lazyload', 'effect-fade');

		if (typeof src !== 'string' || image.src.length > 0 && image.complete) {
			images.splice(i, 1);
			continue;
		}

		imageSrcs.push(src);
	}

	if (images.length === 0) return;

	images.forEach((image, i) => {
		image.src = '';

		image.addEventListener('load', (event) => {
			let message = 'hiperdex imageLoader: loaded image';

			if (!images[i + 1]) {
				// If this is the last image, log the message and return
				console.log(`${message} (${images.length}/${images.length}) - completed`);
				return;
			}
			if (images.length <= 10 || (i + 1) % 10 === 0) message += ` (${i + 1}/${images.length})`;
			console.log(message);

			// Load next image
			images[i + 1].src = imageSrcs[i + 1];
		}, { once: true });
	});

	// Load first image
	images[0].src = imageSrcs[0];
};
