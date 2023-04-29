import { qs, qsa, checkIfSiteIsCloudflareCheck } from '../../utils.js';

const cloudflareSearchArgName = '__cf_chl_rt_tk';
const timestamp = Math.round(Date.now() / 10000);

const wildcardPath = location.pathname.replace(/\/[^\/]*/g, '/*');

const isReading = wildcardPath.split('/').length === 5 && location.pathname.startsWith('/manga/');

const locationManager = () => {
	let url = new URL(location.href);

	url.searchParams.forEach((value, key) => {
		if (key === cloudflareSearchArgName) {
			// If cloudflare search arg is present, remove it
			url.searchParams.delete(key);
		} else if (key === 'timestamp') {
			if (!isReading) return;
			// If isReading, remove timestamp (Loading cached pages is wanted here)
			url.searchParams.delete(key);
		}
	});

	// If not isReading set timestamp (don't want cached pages)
	if (!isReading) url.searchParams.set('timestamp', timestamp.toString());

	if (location.search !== url.search) location.replace(url);
};

const imageLoader = () => {
	const images = Array.from(qsa<HTMLImageElement>('img.wp-manga-chapter-img'));

	const imageSrcs: string[] = [];

	for (let i = 0; i < images.length; i++) {
		const image = images[i];
		const src = image.dataset.src?.trim();

		delete image.dataset.src;
		image.classList.remove('img-responsive', 'lazyload', 'effect-fade');

		if (typeof src !== 'string' || image.src.length > 0 && image.complete) {
			images.splice(i, 1);
			continue;
		}

		imageSrcs.push(src);
	}

	if (images.length === 0) return;

	images.forEach((image, i) => {
		image.src = '';

		image.addEventListener('load', (event) => {
			let message = 'hiperdex imageLoader: loaded image';

			if (!images[i + 1]) {
				// If this is the last image, log the message and return
				console.log(`${message} (${images.length}/${images.length}) - completed`);
				return;
			}
			if (images.length <= 10 || (i + 1) % 10 === 0) message += ` (${i + 1}/${images.length})`;
			console.log(message);

			// Load next image
			images[i + 1].src = imageSrcs[i + 1];
		}, { once: true });
	});

	// Load first image
	images[0].src = imageSrcs[0];
};

// Detect cloudflare and prevent spamming requests
if (!checkIfSiteIsCloudflareCheck()) {
	locationManager();

	document.addEventListener('click', (event) => {
		if (!(event.target instanceof HTMLAnchorElement)) return;

		// Check if the element clicked on is the "Sign In" button
		if (event.target.dataset.target === '#form-login') {
			// Check remember me checkbox for login
			const rememberme = qs('input#rememberme');
			if (rememberme instanceof HTMLInputElement) rememberme.checked = true;
		}
	});

	if (document.readyState !== 'loading') {
		if (isReading) imageLoader();
	} else {
		document.addEventListener('readystatechange', () => {
			if (document.readyState === 'loading') return;
			if (document.readyState === 'interactive') {
				if (isReading) imageLoader();
				return;
			}
		});
	}
}