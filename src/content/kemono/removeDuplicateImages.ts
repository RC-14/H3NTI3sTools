import { z } from 'zod';
import { qs, qsa } from '/src/lib/utils';

const apiResponseSchema = z.object({
	attachments: z.array(z.object({
		path: z.string()
	})),
	file: z.object({
		path: z.string().optional()
	})
});

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
	apiUrl.pathname = '/api/v1' + apiUrl.pathname;
	const apiResponse = await fetch(apiUrl).then((response) => response.json());
	const parsedApiResponse = apiResponseSchema.parse(apiResponse);
};
