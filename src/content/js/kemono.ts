import { qs, qsa } from '../../utils.js';

// For some reason the first image is shown twice (sometimes the first image is a cropped version of the second image)
// but it won't hurt to remove other duplicates as well.
const removeDuplicateImages = () => {
	const imgWrappers = Array.from(qsa<HTMLDivElement>('.post__files > div.post__thumbnail'));

	if (imgWrappers.length < 2) return;

	// Remove the first image
	imgWrappers.splice(0, 1)[0].remove();

	const imgSrcs = imgWrappers.map(wrapper => qs<HTMLAnchorElement>('a.image-link', wrapper)?.href);

	imgSrcs.forEach((src, i) => {
		if (src === undefined) return;
		if (imgSrcs.indexOf(src) === i) return;

		imgWrappers[i].remove();
	});
};

// Images are in a lower resolution until you click on them.
const loadHighResImages = () => {
	const imgElements = qsa<HTMLImageElement>('.post__files > .post__thumbnail > a.fileThumb.image-link > img[data-src]');

	imgElements.forEach((imgElement, i) => {
		// Prevent triggering other event listeners and redirects
		imgElement.addEventListener('click', (event) => {
			event.stopImmediatePropagation();
			event.preventDefault();
		});

		// Images sometimes fail to load the first time so we try multiple times.
		let failCounter = 0;
		imgElement.addEventListener('error', (event) => {
			if (failCounter === 5) return;
			failCounter++;

			setTimeout(() => {
				const imgLink = imgElement.parentElement as HTMLAnchorElement;
				imgElement.src = '';
				imgElement.src = imgLink.href;
			}, 100);
		});

		imgElement.addEventListener('load', (event) => {
			console.log(`Loaded img ${i + 1}/${imgElements.length}`);

			// Remove data-src attribute to prevent mistaking it for a low res image
			delete imgElement.dataset.src;
		});

		// The src for the high res version is in the href attribute of the parent a element
		const imgLink = imgElement.parentElement as HTMLAnchorElement;
		imgElement.src = imgLink.href;
	});
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
	if (document.readyState !== 'loading') {
		removeDuplicateImages();
	} else {
		document.addEventListener('readystatechange', () => {
			if (document.readyState !== 'interactive') return;

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
