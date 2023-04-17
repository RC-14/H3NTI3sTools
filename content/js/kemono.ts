import { qs, qsa } from '../../utils.js';

// Most of the time I don't want to see the content but the files instead, so I just hide the content
const hideContent = () => {
	// If there are no files I probably want to see the content
	if (qs('.post__files') === null) return;

	const content = qs<HTMLDivElement>('div.post__content');

	// There may be no content
	if (!(content instanceof HTMLDivElement)) return;

	qsa<HTMLImageElement>('img', content).forEach((img) => {
		img.loading = 'lazy';
		img.decoding = 'async';
	});

	const showContentButton = Object.assign(document.createElement('button'), {
		innerText: '...'
	});

	showContentButton.addEventListener('click', (event) => {
		showContentButton.replaceWith(content);
	}, { once: true, passive: true });

	content.replaceWith(showContentButton);
};

// For some reason the first image is shown twice (sometimes the first image is a cropped version of the second image)
// but it won't hurt to remove other duplicates as well.
const removeDuplicateImages = () => {
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

	// Request the page (it's text because it's a website)
	fetch(searchURL).then(response => response.text()).then((html) => {
		// The title might have been used multiple times so we have to filter the results
		const chunks = html.split(/ attachments?/g);
		const chunkForCurrentPost = chunks.filter(t => t.includes(location.pathname))[0];

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

// Images are in a lower resolution until you click on them.
const loadHighResImages = () => {
	const imgElements = qsa<HTMLImageElement>('.post__files > .post__thumbnail > a.fileThumb.image-link > img[data-src]');

	imgElements.forEach((imgElement, i) => setTimeout(() => {
		// Prevent triggering other event listeners and redirects
		imgElement.addEventListener('click', (event) => {
			event.stopImmediatePropagation();
			event.preventDefault();
		});

		const newImageElement = Object.assign(document.createElement('img'), {
			decoding: 'async',
			loading: 'eager'
		});

		// Images sometimes fail to load the first time so we try multiple times.
		let failCounter = 0;
		newImageElement.addEventListener('error', (event) => {
			if (failCounter === 5) return;
			failCounter++;

			setTimeout(() => {
				const imgLink = imgElement.parentElement as HTMLAnchorElement;
				newImageElement.src = '';
				newImageElement.src = imgLink.href;
			}, 100);
		});

		newImageElement.addEventListener('load', (event) => {
			console.log(`Loaded img ${i + 1}/${imgElements.length}`);

			newImageElement.decode().then(() => {
				imgElement.replaceWith(newImageElement);
			}).catch((reason) => {
				console.warn(`Decoding image ${i} ("${newImageElement.src}") failed: ${reason}`)

				// Dirty fix in case decoding fails
				const imgLink = imgElement.parentElement as HTMLAnchorElement;
				newImageElement.src = '';
				newImageElement.src = imgLink.href;
			});
		});

		// The src for the high res version is in the href attribute of the parent a element
		const imgLink = imgElement.parentElement as HTMLAnchorElement;
		newImageElement.src = imgLink.href;
	}, i * 100));
};

// Make sure the page shows a post
if (location.pathname.match(/^\/\w+\/user\/\d+\/post\/\d+/i)) {
	// Add keyboard shortcuts to go to the next/previous post (arrows are handled by the website)
	document.addEventListener('keydown', (event) => {
		const nextLink = qs<HTMLAnchorElement>('a.post__nav-link.prev');
		const previousLink = qs<HTMLAnchorElement>('a.post__nav-link.next');
		const creatorLink = qs<HTMLAnchorElement>('a.post__user-name');

		switch (event.code) {
			case 'Space':
				if (event.shiftKey) {
					previousLink?.click();
					return;
				}
				nextLink?.click();
				return;

			case 'Escape':
				setTimeout(() => {
					creatorLink?.click();
				}, 100);
				return;
		}
	});

	// Remove duplicates
	if (document.readyState === 'interactive' || document.readyState === 'complete') {

		hideContent();
		removeDuplicateImages();
	} else {
		document.addEventListener('readystatechange', () => {
			if (document.readyState !== 'interactive') return;

			hideContent();
			removeDuplicateImages();
		});
	}

	// Load High res versions
	if (document.readyState === 'complete') {
		loadHighResImages();
	} else {
		document.addEventListener('readystatechange', () => {
			if (document.readyState !== 'complete') return;

			loadHighResImages();
		});
	}
}
