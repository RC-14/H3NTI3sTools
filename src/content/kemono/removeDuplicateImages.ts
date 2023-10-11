import { z } from 'zod';
import { qs, qsa } from '/src/lib/utils';

const apiResponseSchema = z.array(z.object({
	attachments: z.array(z.object({
		path: z.string()
	})),
	file: z.object({
		path: z.string().optional()
	})
})).nonempty();

// For some reason the first image is shown twice (sometimes the first image is a cropped version of the second image)
// but it won't hurt to remove other duplicates as well.
export const removeDuplicateImages = async () => {
	const imgWrappers = Array.from(qsa<HTMLDivElement>('.post__files > div.post__thumbnail'));

	// If there are 0 or 1 image there can't be any duplicates
	if (imgWrappers.length < 2) return;

	const imgSrcs = imgWrappers.map(wrapper => qs<HTMLAnchorElement>('a.image-link', wrapper)?.href).filter((src, i, srcs) => srcs.indexOf(src) === i);

	imgSrcs.forEach((src, i) => {
		if (src === undefined) return;
		if (imgSrcs.indexOf(src) === i) return;

		imgWrappers.splice(i, 1)[0]!.remove();
	});

	// Check if the first image is a completely unnecessary crop of the second image

	// Use the api to get information about this post
	const apiUrl = new URL(location.href);
	apiUrl.pathname = '/api' + apiUrl.pathname;
	const apiResponse = await fetch(apiUrl).then((response) => response.json());
	const parsedApiResponse = apiResponseSchema.parse(apiResponse)[0];

	// If the api tells us there aren't as many images as we have we remove the first one
	if (parsedApiResponse.attachments.length > 0 && typeof parsedApiResponse.file.path === 'string') {
		const showFirstImageButton = document.createElement('button');
		showFirstImageButton.innerText = 'Show Image';
		showFirstImageButton.addEventListener('click', (event) => showFirstImageButton.replaceWith(imgWrappers[0]!), { passive: true, once: true });

		imgWrappers[0]!.replaceWith(showFirstImageButton);
	}
};
