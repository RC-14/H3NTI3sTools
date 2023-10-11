import { qs, runAfterReadyStateReached } from '/src/lib/utils';

document.addEventListener('click', (event) => {
	// Check if an a element that should open another page was clicked on
	if (event.composedPath().every((element) => {
		if (!(element instanceof HTMLAnchorElement)) return true;
		if (element.href.length === 0) return true;
		if (element.host === location.host && element.port === location.port && element.pathname === location.pathname && element.search === location.search) return true;
		return false;
	})) return;

	event.stopImmediatePropagation();
}, { capture: true });

runAfterReadyStateReached('interactive', () => {
	const videoPreviewContainer = qs<HTMLDivElement>('.hvpi-summary > div:not(.hvpis-text)');
	if (!(videoPreviewContainer instanceof HTMLDivElement)) return;

	const observer = new MutationObserver(() => {
		observer.disconnect();

		const previewElements: Element[] = [];
		const previewCount = videoPreviewContainer.children.length;

		for (let i = 1; i < previewCount; i++) {
			previewElements.push(videoPreviewContainer.children[1]!);
			previewElements[i - 1]!.remove();
		}

		setTimeout(() => {
			videoPreviewContainer.append(...previewElements);
		}, 500);
	});

	observer.observe(videoPreviewContainer, { childList: true });
});
