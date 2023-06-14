import { qsa } from '/src/lib/utils';

/**
 * Loads the images of the "manga" on hiperdex.
 */
export const loadImages = () => {
	const images = Array.from(qsa<HTMLImageElement>('img.wp-manga-chapter-img'));

	if (images.length === 0) return;

	const imageSrcs: string[] = []; // = images.map((img) => img.src.trim());

	for (let i = images.length - 1; i >= 0; i--) {
		const image = images[i];

		// Skip already loaded images
		if (image.complete) {
			images.splice(i, 1);
			continue;
		}

		imageSrcs.push(image.src);
		image.src = '';

		image.addEventListener('load', (event) => {
			let message = 'hiperdex imageLoader: loaded image';

			const nextImage = images.shift();

			// If this is the last image, log the message and return
			if (nextImage === undefined) {
				console.log(`${message} (${imageCount}/${imageCount}) - completed`);
				return;
			}

			// Avoid spamming the log if there are many images.
			if (images.length <= 10 || (i + 1) % 10 === 0) {
				console.log(`${message} (${i + 1}/${imageCount})`);
			}

			// Load next image
			nextImage.src = imageSrcs.pop()!;
		}, { once: true });
	};

	// Used only for logging
	const imageCount = images.length;

	// Load first image
	images.shift()!.src = imageSrcs.pop()!;
};
