import { qs } from '/src/lib/utils';

// Most of the time I don't want to see the content but the files instead, so I just hide the content
export const hideContent = () => {
	// If there are no files I probably want to see the content
	if (qs('.post__files') === null) return;

	const content = qs<HTMLDivElement>('div.post__content');

	// There may be no content
	if (!(content instanceof HTMLDivElement)) return;

	// If there is only one line it's unnecessary to hide it
	if (content.childElementCount === 0) return;
	if (content.childElementCount === 1 && !content.innerText.includes('\n')) {
		if (content.firstElementChild instanceof HTMLParagraphElement && content.firstElementChild.childElementCount === 0) return;
		if (content.firstElementChild instanceof HTMLAnchorElement && content.firstElementChild.childElementCount === 0) return;
	}

	// Show content button
	const showContentButton = document.createElement('button');
	showContentButton.innerText = '▼';
	showContentButton.addEventListener('click', (event: MouseEvent) => showContentButton.replaceWith(content), { passive: true });

	// Hide content
	const hideContentElement = () => content.replaceWith(showContentButton);
	hideContentElement();

	// Hide content button(s)
	const topHideContentButton = document.createElement('button');
	topHideContentButton.innerText = '▲';
	topHideContentButton.addEventListener('click', hideContentElement, { passive: true });

	content.prepend(topHideContentButton, document.createElement('br'));

	// Don't add a second hide button if there isn't that much content
	if (content.childElementCount < 10 && qs('img', content) === null && qs('video', content) === null) return;

	// Add a copy of topHideContentButton to the bottom of the content
	const bottomHideContentButton = topHideContentButton.cloneNode(true);
	bottomHideContentButton.addEventListener('click', hideContentElement, { passive: true });

	content.append(document.createElement('br'), bottomHideContentButton);
};
