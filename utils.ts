export { default as StorageHelper } from './StorageHelper.js';
export { default as htmlCharRef } from './htmlCharReferences.js';

export const qs = <T extends Element>(selector: string, parent: Document | Element = document) => parent.querySelector<T>(selector);
export const qsa = <T extends Element>(selector: string, parent: Document | Element = document) => parent.querySelectorAll<T>(selector);

// function that returns a copy of the contents of a template element
export const useTemplate = (template: HTMLTemplateElement, deep = true) => {
	if (!template.content.firstElementChild) return null;
	return template.content.firstElementChild.cloneNode(deep);
};

export const isElementEditable = (element: HTMLElement) => {
	if (element instanceof HTMLInputElement) return true;
	if (element instanceof HTMLTextAreaElement) return true;
	if (element.isContentEditable) return true;
	return false;
};

export const sendRuntimeMessage: sendRuntimeMessage = (target, handler, msg, data) => {
	return chrome.runtime.sendMessage<RuntimeMessage>({
		target,
		handler,
		msg,
		data
	});
};

export const getOS = () => {
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
export const showMessage = (message: string, options?: { color?: string, duration?: number, size?: 'xx-small' | 'x-small' | 'smaller' | 'small' | 'medium' | 'large' | 'larger' | 'x-large' | 'xx-large' | 'xxx-large'; }) => {
	// Default options
	const color = options?.color ?? 'darkgrey';
	const duration = options?.duration ?? 3000;
	const size = options?.size ?? 'large';

	// Get the wrapper element
	let wrapper = qs<HTMLDivElement>('div#h3nti3-messages');
	if (wrapper === null) {
		// If the wrapper element doesn't exist, create it
		wrapper = document.createElement('div');

		wrapper.id = 'h3nti3-messages';
		wrapper.style.position = 'fixed';
		wrapper.style.top = wrapper.style.right = '0';

		document.documentElement.append(wrapper);
	}

	// Create the message element
	const msgElement = document.createElement('p');
	
	msgElement.innerText = message;
	msgElement.style.color = color;
	msgElement.style.fontSize = size;
	msgElement.style.margin = '0.3rem';

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

export const generateIDBGetter = (name: string, version: number, upgradeneededListener: (event: IDBVersionChangeEvent) => void, blockedListener?: (event: Event) => void) => {
	return () => new Promise<IDBDatabase>((resolve, reject) => {
		const request = indexedDB.open(name, version);

		request.addEventListener('error', (event) => reject(request.error));

		if (blockedListener !== undefined) request.addEventListener('blocked', blockedListener);

		request.addEventListener('success', (event) => {
			if (request.result instanceof IDBDatabase) {
				resolve(request.result);
				return;
			}

			reject(new Error("Result of the request isn't an instance of IDBDatabase."));
		});

		request.addEventListener('upgradeneeded', upgradeneededListener);
	});
};

export const isValidUrl = (string: string) => {
	try {
		new URL(string);
	} catch (error) {
		return false;
	}
	return true;
};

export const checkIfSiteIsCloudflareCheck = () => {
	const scriptElements = Array.from(document.scripts);

	for (const scriptElement of scriptElements) {
		// Check if the script is a Cloudflare challenge
		if (scriptElement.src.startsWith('https://challenges.cloudflare.com/')) return true;
	}

	return false;
};
