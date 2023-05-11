import { qs } from '/src/lib/utils';

let listenerAttached = false;

const autoRememberMeListener = (event: MouseEvent) => {
	if (!(event.target instanceof HTMLAnchorElement)) return;

	// Check if the element clicked on is the "Sign In" button
	if (event.target.dataset.target === '#form-login') {
		// Check remember me checkbox for login
		const rememberMe = qs('input#rememberme');
		if (rememberMe instanceof HTMLInputElement) rememberMe.checked = true;
	}
};

/**
 * Attach the auto remember me listener.
 */
export const addAutoRememberMeListener = () => {
	if (listenerAttached) return;

	document.addEventListener('click', autoRememberMeListener);
};

/**
 * Remove the auto remember me listener.
 */
export const removeAutoRememberMeListener = () => {
	if (!listenerAttached) return;

	document.removeEventListener('click', autoRememberMeListener);
};

/**
 * Check if the auto remember me listener is attached.
 * 
 * @returns `true` if the listener is attached and `false` otherwise.
 */
export const isAutoRememberMeListenerAttached = () => listenerAttached;
