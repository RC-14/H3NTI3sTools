import { qsa } from '/src/lib/utils';

export const optimizeImageLoading = () => {
	for (const img of Array.from(qsa<HTMLImageElement>('.post__content img'))) {
		img.loading = 'lazy';
		img.decoding = 'async';
	}
}
