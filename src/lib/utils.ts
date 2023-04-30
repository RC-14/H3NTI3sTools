/**
 * Returns the first Element which matches the given CSS Selector.
 * 
 * Alias for querySelector()
 * 
 * @param selector The CSS Selector which is used to search for an element.
 * @param parent The element whose children you want to search. (default: document)
 * @returns The first child element of `parent` which matches `selector`.
 */
export const qs = <T extends Element>(selector: string, parent: Document | Element = document) => parent.querySelector<T>(selector);
/**
 * Returns a NodeList of all elements which match the given CSS Selector.
 * 
 * Alias for querySelectorAll()
 * 
 * @param selector The CSS Selector which is used to search for elements.
 * @param parent The element whose children you want to search. (default: document)
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
 * @param element HTMLElement
 * 
 * @returns `true` if the element is editable `false` otherwise.
 */
export const isElementEditable = (element: HTMLElement) => {
	if (element instanceof HTMLInputElement) return true;
	if (element instanceof HTMLTextAreaElement) return true;
	if (element.isContentEditable) return true;
	return false;
};
