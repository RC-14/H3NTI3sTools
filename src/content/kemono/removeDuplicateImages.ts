import { qs, qsa } from '/src/lib/utils';

// For some reason the first image is shown twice (sometimes the first image is a cropped version of the second image)
// but it won't hurt to remove other duplicates as well.
export const removeDuplicateImages = () => {
	const imgWrappers = Array.from(qsa<HTMLDivElement>('.post__files > div.post__thumbnail'));

	if (imgWrappers.length < 2) return;

	const imgSrcs = imgWrappers.map(wrapper => qs<HTMLAnchorElement>('a.image-link', wrapper)?.href).filter((src, i, srcs) => srcs.indexOf(src) === i);

	imgSrcs.forEach((src, i) => {
		if (src === undefined) return;
		if (imgSrcs.indexOf(src) === i) return;

		imgWrappers.splice(i, 1)[0].remove();
	});

	// Check if the first image is a completely unnecessary crop of the second image

	// We'll search for the post title to avoid having to request multiple pages
	const titleElement = qs('.post__title > span');
	if (!(titleElement instanceof HTMLSpanElement)) throw new Error("[kemono] Couldn't find the title");

	// Constructing the url of the site we want to request
	const searchURL = new URL(location.href);
	searchURL.pathname = searchURL.pathname.split('/post/')[0];
	searchURL.searchParams.append('q', titleElement.innerText);

	// Request the page
	fetch(searchURL).then(response => response.text()).then((html) => {
		// The title might have been used multiple times so we have to filter the results
		const chunks = html.split(' attachment');
		const chunkForCurrentPost = chunks.filter(chunk => chunk.includes(location.pathname))[0];

		const attachmentCount = parseInt(chunkForCurrentPost.match(/\d+$/)?.[0] ?? 'NaN');
		if (isNaN(attachmentCount)) throw new Error(`[kemono] attachmentCount is NaN (got ${chunks.length} chunk(s) and type after filter is ${typeof chunkForCurrentPost})`);
		if (attachmentCount > imgWrappers.length) throw new Error('[kemono] We somehow got an attachmentCount higher then the amount of images on the page.');
		if (attachmentCount < imgWrappers.length - 1) throw new Error("[kemono] We somehow got an attachment count that's too little.");

		// Everything is normal and this request was useless
		if (attachmentCount === imgWrappers.length) return;

		// This check was - sadly - worth it and the cropped version gets now removed
		imgWrappers[0].remove();
	});
};
