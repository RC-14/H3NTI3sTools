export { default as StorageHelper } from './StorageHelper.js';

export const qs = <T extends Element>(selector: string, parent: Document | Element = document) => parent.querySelector(selector) as T | null;
export const qsa = <T extends Element>(selector: string, parent: Document | Element = document) => parent.querySelectorAll(selector) as NodeListOf<T>;

// function that returns a copy of the contents of a template element
export const useTemplate = (template: HTMLTemplateElement, deep = true): Node | null => {
	if (!template.content.firstElementChild) return null;
	return template.content.firstElementChild.cloneNode(deep);
};

export const isElementEditable = (element: HTMLElement): boolean => {
	if (element instanceof HTMLInputElement) return true;
	if (element instanceof HTMLTextAreaElement) return true;
	if (element.isContentEditable) return true;
	return false;
};

export const sendRuntimeMessage: sendRuntimeMessage = (handler, msg, data) => {
	return chrome.runtime.sendMessage<RuntimeMessage>({
		target: 'background',
		handler,
		msg,
		data
	});
};

export const getOS = (): 'MacOS' | 'iOS' | 'Windows' | 'Android' | 'Linux' | 'Unknown' => {
	let userAgent = navigator.userAgent;
	// @ts-ignore - Unknown by types but it's there... and if it's not there we use something else
	let platform: string = navigator.userAgentData?.platform;
	if (platform == null) {
		platform = navigator.platform;
	}

	const macosPlatforms = ['macOS', 'Macintosh', 'MacIntel', 'MacPPC', 'Mac68K'];
	const windowsPlatforms = ['Win32', 'Win64', 'Windows', 'WinCE'];
	const iosPlatforms = ['iPhone', 'iPad', 'iPod'];

	if (macosPlatforms.indexOf(platform) !== -1) {
		return 'MacOS';
	} else if (iosPlatforms.indexOf(platform) !== -1) {
		return 'iOS';
	} else if (windowsPlatforms.indexOf(platform) !== -1) {
		return 'Windows';
	} else if (/Android/.test(userAgent)) {
		return 'Android';
	} else if (/Linux/.test(platform)) {
		return 'Linux';
	}

	return 'Unknown';
};

// function that shows customizable messages in the web page without hiding/deleting content or using alert
export const showMessage = (message: string, options?: { color?: string, duration?: number, size?: 'small' | 'medium' | 'large'; }) => {
	// Default options
	const color = options?.color ?? 'darkgrey';
	const duration = options?.duration ?? 3000;
	const size = options?.size ?? 'large';

	// Get the wrapper element
	let wrapper = qs<HTMLDivElement>('div#h3nti3Messages');
	if (wrapper === null) {
		// If the wrapper element doesn't exist, create it
		wrapper = document.createElement('div');
		wrapper.id = 'h3nti3Messages';

		wrapper.style.position = 'fixed';
		wrapper.style.top = '0';
		wrapper.style.right = '0';

		document.documentElement.append(wrapper);
	}

	// Create the message element
	const msgElement = document.createElement('p');
	msgElement.innerText = message;
	msgElement.style.color = color;
	msgElement.style.fontSize = size;

	if (wrapper.firstElementChild == null) {
		wrapper.append(msgElement);
	} else {
		// If there is already a message, insert it at the top
		wrapper.firstElementChild.before(msgElement);
	}

	setTimeout(() => {
		msgElement.remove();
	}, duration);
};

// function that checks if a URL points to an existing file
export const checkIfFileExists = (url: URL) => {
	return new Promise<boolean>((resolve, reject) => {
		fetch(url.href, { method: 'HEAD' }).then((response) => {
			resolve(response.ok);
		}, (error) => {
			resolve(false);
		});
	});
};

export const generateWildcardPath = (path: string): string => {
	if (!path.startsWith('/')) throw new Error('Path must start with "/"');
	if (!path.length) return '/*';
	path = path.replace(/\/[^\/]*/g, '/*');
	return path;
};

// function that loads images based on a list of URLs
export const preloadImages = (urls: URL[], parrallel = 4, verbose = 2) => {
	// Check if the parameters are valid
	if (!Array.isArray(urls)) {
		throw new Error('urls is not an Array');
	} else if (urls.length === 0) {
		throw new Error('urls is an empty Array');
	} else if (typeof parrallel !== 'number') {
		throw new Error('parrallel is not a number');
	} else if (parrallel < 1) {
		throw new Error('parrallel is less than 1');
	}

	if (urls.length < parrallel) parrallel = urls.length;

	// Create a log function
	const log = (message: string) => {
		if (verbose > 0) console.log(message);
		if (verbose > 1) showMessage(message);
	};
	let counter = 0;
	const noifyLoaded = () => {
		counter++;
		log(`Loaded ${counter}/${urls.length}`);
	};

	log('Preloading...');

	return new Promise<void>((resolve, reject) => {
		interface loaderConfig {
			done: boolean;
			parrallel: number;
			queue: URL[];
		};

		// Preload forwards and backwards if possible
		let forward: loaderConfig = {
			done: false,
			parrallel: Math.ceil(parrallel / 2),
			queue: urls.slice(0, Math.ceil(urls.length / 2)),
		};
		let backward: loaderConfig = {
			done: false,
			parrallel: parrallel - forward.parrallel,
			queue: urls.slice(Math.ceil(urls.length / 2), urls.length),
		};
		let finished = () => {
			if (forward.done && backward.done) {
				log('Done preloading');
				resolve();
			}
		};

		console.dir(forward);
		console.dir(backward);

		// Don't use backward if backward.parrallel is 0
		if (backward.parrallel === 0) {
			forward.queue = forward.queue.concat(backward.queue);
			backward.queue = [];
			backward.done = true;
		} else {
			// Reverse the backward queue so that it loads backwards and not from the middle of the list
			backward.queue.reverse();
		}

		const allDone = (counters: number[]) => {
			let done = true;
			counters.forEach((counter) => {
				done = done && counter === -1;
			});
			return done;
		};

		const loader = ({ done, parrallel, queue }: loaderConfig) => {
			return new Promise<void>((resolve, reject) => {
				let counters: number[] = [];
				let imgs: HTMLImageElement[] = [];

				for (let i = 0; i < parrallel; i++) {
					counters.push(i);
					imgs.push(new Image());

					// Called when image finished loading
					imgs[i].onload = () => {
						noifyLoaded();

						// Get the index of the next image
						counters[i] += parrallel;

						// If all images are loaded, resolve the promise
						if (counters[i] >= queue.length) {
							counters[i] = -1;

							done = allDone(counters);
							if (done) resolve();
							return;
						}

						// Load the next image
						imgs[i].src = queue[counters[i]].href;
					};

					// Load the first image
					imgs[i].src = queue[i].href;
				}
			});
		};

		// Forward
		loader(forward).then(finished);

		// Backward
		if (!backward.done) loader(backward).then(finished);
	});
};
