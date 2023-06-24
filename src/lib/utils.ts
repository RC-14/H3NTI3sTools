import { runtime } from 'webextension-polyfill';
import { RuntimeMessage } from './fragments';
import { encodeAll as encodeAllAsHTMLCharReference } from './htmlCharReferences';

/**
 * Returns the first Element which matches the given CSS Selector.
 * 
 * Alias for querySelector()
 * 
 * @param selector The CSS Selector which is used to search for an element.
 * 
 * @param parent The element whose children you want to search. (default: `document`)
 * 
 * @returns The first child element of `parent` which matches `selector`.
 */
export const qs = <T extends Element>(selector: string, parent: Document | Element = document) => parent.querySelector<T>(selector);
/**
 * Returns a NodeList of all elements which match the given CSS Selector.
 * 
 * Alias for querySelectorAll()
 * 
 * @param selector The CSS Selector which is used to search for elements.
 * 
 * @param parent The element whose children you want to search. (default: `document`)
 * 
 * @returns A NodeList of all child elements of `parent` which match `selector`.
 */
export const qsa = <T extends Element>(selector: string, parent: Document | Element = document) => parent.querySelectorAll<T>(selector);

/**
 * Returns a copy of the contents of a template element.
 * 
 * @param template The template of which you want to use the content.
 * 
 * @returns A copy of the contents of the template or `null` if it's empty.
 */
export const useTemplate = (template: HTMLTemplateElement) => {
	if (!template.content.firstElementChild) return null;
	return template.content.firstElementChild.cloneNode(true);
};

/**
 * Checks if the element is editable by the user. (if the user can write in it)
 * 
 * @param element The element you want to check.
 * 
 * @returns `true` if the element is editable `false` otherwise.
 */
export const isElementEditable = (element: HTMLElement) => {
	if (element instanceof HTMLInputElement) return true;
	if (element instanceof HTMLTextAreaElement) return true;
	if (element.isContentEditable) return true;
	return false;
};

/**
 * Sends a `RuntimeMessage` via `browser.runtime.sendMessage()` and returns the reply.
 * 
 * Can't send messages to content scripts. 
 * 
 * @param target Where to send the `RuntimeMessage` to.
 * 
 * @param fragmentId The id of the receiving fragment.
 * 
 * @param msg The actual message.
 * 
 * @param data The data to send along, if any.
 * 
 * @returns A Promise resolving to the reply.
 */
export const sendRuntimeMessage = (target: Exclude<RuntimeMessage['target'], 'content'>, fragmentId: RuntimeMessage['fragmentId'], msg: RuntimeMessage['msg'], data?: RuntimeMessage['data']) => {
	const request: RuntimeMessage = {
		target,
		fragmentId,
		msg,
		data
	};

	return runtime.sendMessage(request) as Promise<RuntimeMessage['data']>;
};

/**
 * Checks if the site is a cloudflare check.
 * 
 * @param site A Window object. (default: `window`)
 * 
 * @returns `true` if the site is a cloudflare check `false` otherwise.
 */
export const isSiteCloudflareCheck = (site: Window = window) => {
	return site.document.title === 'Just a moment...';
};

/**
 * Calls the callback function after the readystate was reached.
 * 
 * The callback is guaranteed to be run as long as the page doesn't get closed.
 * This means if the next readystate is already reached the callback will also be called despite it not being the desired one.
 * 
 * @param readystate The desired ready state. (`interactive` or `complete`)
 * 
 * @param callback The function to be called when the desired readystate is reached.
 */
export const runAfterReadyStateReached = (readystate: Exclude<DocumentReadyState, 'loading'>, callback: () => unknown) => {
	if (document.readyState === readystate || document.readyState === 'complete') {
		callback();
		return;
	}

	document.addEventListener('readystatechange', () => callback(), { once: true });
};

type showMessageOptions = {
	/** A CSS color. */color?: string,
	/** The duration the message will be shown for in ms. */duration?: number,
	/** The CSS size of the message */ size?: 'xx-small' | 'x-small' | 'smaller' | 'small' | 'medium' | 'large' | 'larger' | 'x-large' | 'xx-large' | 'xxx-large';
};

/**
 * Shows a message in the web page.
 * 
 * @param message The message to be shown.
 * 
 * @param options An object containing customizations for the message.
 */
export const showMessage = (message: string, { color = 'darkgrey', duration = 3_000, size = 'large' }: showMessageOptions = {}) => {
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

	// Insert the message at the top
	wrapper.insertAdjacentElement('afterbegin', msgElement);

	// Remove the message after <duration>
	setTimeout(() => {
		msgElement.remove();
	}, duration);
};

/**
 * Creates a function that can be used to get an IDBDatabase object to access an indexedDB database.
 * 
 * Useful to streamline the use of idb and avoid differing upgradeneeded handler functions.
 * 
 * @param name The name of the database.
 * 
 * @param version The version at which to open the database.
 * 
 * @param upgradeneededListener A callback function that gets called if an attempt was made to open a database with a version number higher than its current version. (copied from MDN)
 * 
 * @param blockedListener A callback function that gets called if an open connection to a database is blocking a `versionchange` transaction on the same database. (copied from MDN)
 * 
 * @returns A function that returns a Promise that resolves to an IDBDatabase object.
 */
export const generateIDBGetter = (name: string, version: number, upgradeneededListener: (event: IDBVersionChangeEvent & Record<'target', IDBOpenDBRequest>) => unknown, blockedListener?: (event: Event) => unknown) => {
	return () => new Promise<IDBDatabase>((resolve, reject) => {
		const request = indexedDB.open(name, version);

		request.addEventListener('error', (event) => reject(new Error(`Couldn't get iDB (name: "${name}", version: ${version}): ${request.error}`)));

		if (blockedListener !== undefined) request.addEventListener('blocked', blockedListener);

		request.addEventListener('success', (event) => {
			if (request.result instanceof IDBDatabase) {
				resolve(request.result);
				return;
			}

			reject(new Error("Result of the request isn't an instance of IDBDatabase."));
		});

		request.addEventListener('upgradeneeded', upgradeneededListener as (event: IDBVersionChangeEvent) => ReturnType<typeof upgradeneededListener>);
	});
};

/**
 * Generates a data:image/svg+xml,... uri from a character that can be used as the src attribute of an img element.
 * 
 * @param char A string with a length of 1.
 * 
 * @param color The CSS color of the string. (default: black)
 * 
 * @returns A data url that can be used as the src of an img element.
 */
export const makeImageFromChar = (char: string, color: string = 'black') => {
	if (char.length !== 1) throw new Error("String longer than 1 character.");

	const encodedChar = encodeURIComponent(encodeAllAsHTMLCharReference(char));
	const encodedColor = encodeURIComponent(encodeAllAsHTMLCharReference(color));

	const charPlaceholder = 'replaceWithChar';
	const colorPlaceholder = 'replaceWithColor';

	const uriString = encodeURI(`data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="${colorPlaceholder}"><text y=".9em" font-size="90">${charPlaceholder}</text></svg>`);

	return uriString.replace(charPlaceholder, encodedChar).replace(colorPlaceholder, encodedColor);
};
