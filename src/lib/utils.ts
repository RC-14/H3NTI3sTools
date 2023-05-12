import { runtime } from 'webextension-polyfill';
import { RuntimeMessage } from './fragments';

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
