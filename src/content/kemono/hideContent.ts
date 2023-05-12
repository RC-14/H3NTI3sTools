import { qs, qsa } from '/src/lib/utils';

const content = qs<HTMLDivElement>('div.post__content')
let showContentButton: HTMLButtonElement | undefined;

const showContentListener = (event: MouseEvent) => showContentButton?.replaceWith(content!);

// Most of the time I don't want to see the content but the files instead, so I just hide the content
export const hideContent = () => {
	// If there are no files I probably want to see the content
	if (qs('.post__files') === null) return;

	// There may be no content
	if (!(content instanceof HTMLDivElement)) return;

	for (const img of Array.from(qsa<HTMLImageElement>('img', content))) {
		img.loading = 'lazy';
		img.decoding = 'async';
	}

	showContentButton = document.createElement('button');
	showContentButton.innerText = '...';

	showContentButton.addEventListener('click', showContentListener, { once: true, passive: true });

	content.replaceWith(showContentButton);
};
