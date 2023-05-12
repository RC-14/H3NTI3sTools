import { qs, qsa } from '/src/lib/utils';

// Most of the time I don't want to see the content but the files instead, so I just hide the content
export const hideContent = () => {
	// If there are no files I probably want to see the content
	if (qs('.post__files') === null) return;

	const content = qs<HTMLDivElement>('div.post__content');

	// There may be no content
	if (!(content instanceof HTMLDivElement)) return;

	for (const img of Array.from(qsa<HTMLImageElement>('img', content))) {
		img.loading = 'lazy';
		img.decoding = 'async';
	}

	const showContentButton = document.createElement('button');
	showContentButton.innerText = '...';

	showContentButton.addEventListener('click', (event: MouseEvent) => showContentButton.replaceWith(content), { once: true, passive: true });

	content.replaceWith(showContentButton);
};
