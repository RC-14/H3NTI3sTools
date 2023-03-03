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
	
	const showContentButton = document.createElement('button');
	showContentButton.innerText = '...';

	showContentButton.addEventListener('click', (event) => {
		showContentButton.replaceWith(content);
	}, { once: true, passive: true });

	content.replaceWith(showContentButton);
}

// For some reason the first image is shown twice (sometimes the first image is a cropped version of the second image)
// but it won't hurt to remove other duplicates as well.
const removeDuplicateImages = () => {
	const imgWrappers = Array.from(qsa<HTMLDivElement>('.post__files > div.post__thumbnail'));

	if (imgWrappers.length < 2) return;

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

	imgElements.forEach((imgElement, i) => setTimeout(() => {
		// Prevent triggering other event listeners and redirects
		imgElement.addEventListener('click', (event) => {
			event.stopImmediatePropagation();
			event.preventDefault();
		});

		const newImageElement = document.createElement('img');
		newImageElement.decoding = 'async';
		newImageElement.loading = 'eager';

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
