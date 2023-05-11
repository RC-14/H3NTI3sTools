import { addAutoRememberMeListener } from './autoRememberMe';
import { loadImages } from './imageLoader';
import { isSiteCloudflareCheck } from '/src/lib/utils';

const isReading = location.pathname.split('/').length === 5 && location.pathname.startsWith('/manga/');

// Detect cloudflare and prevent spamming requests
if (!isSiteCloudflareCheck()) {
	addAutoRememberMeListener();

	if (isReading) {
		if (document.readyState !== 'loading') {
			loadImages();
		} else {
			document.addEventListener('readystatechange', () => loadImages(), { once: true });
		}
	}
}
