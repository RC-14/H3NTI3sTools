/**
 * CSS class that hides an element.
 */
export const HIDDEN_CLASS = 'hidden';

/**
 * CSS class that makes an element invisible.
 */
export const INVISIBLE_CLASS = 'invisible';

/**
 * Adds the CSS hidden class to the elements class list.
 * 
 * @param element The element you want to hide.
 */
export const hideElement = (element: HTMLElement) => {
	element.classList.add(HIDDEN_CLASS);
};

/**
 * Removes the CSS hidden class from the elements class list.
 * 
 * @param element The element you want to show.
 */
export const showElement = (element: HTMLElement) => {
	element.classList.remove(HIDDEN_CLASS);
};

/**
 * Adds the CSS hidden class to the elements class list.
 * 
 * @param element The element you want to hide.
 */
export const makeElementInvisible = (element: HTMLElement) => {
	element.classList.add(INVISIBLE_CLASS);
};

/**
 * Removes the CSS hidden class from the elements class list.
 * 
 * @param element The element you want to show.
 */
export const makeElementVisible = (element: HTMLElement) => {
	element.classList.remove(INVISIBLE_CLASS);
};
