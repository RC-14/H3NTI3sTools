import { z } from 'zod';
import StorageHelper from '../StorageHelper';
import { UrlSchema } from './types';

const SELECTION_STORAGE_KEY = 'selection';

const UrlsParameterSchema = z.union([UrlSchema, z.instanceof(URL)]).transform((url) => typeof url === 'string' ? url : url.href).array();

const storage = new StorageHelper('local', 'viewer');

/**
 * Gets the current selection from local storage and returns it.
 * If there is no selection an empty array is returned.
 * 
 * @returns A promise that resolves to the current selection. (An array of url strings)
 */
export const getSelection = async () => {
	const parsedSelection = UrlSchema.array().safeParse(await storage.get(SELECTION_STORAGE_KEY));

	return parsedSelection.success ? parsedSelection.data : [];
};

/**
 * Adds all supplied urls to the selection in local storage.
 * 
 * @param urls Url strings or URL objects.
 */
export const addToSelection = async (...urls: (string | URL)[]) => {
	const parsedUrls = UrlsParameterSchema.parse(urls);

	const selection = await getSelection();

	for (const url of parsedUrls) {
		if (selection.includes(url)) continue;
		selection.push(url);
	}

	await storage.set(SELECTION_STORAGE_KEY, selection);
};

/**
 * Removes all supplied urls from the selection in local storage.
 * 
 * @param urls Url strings or URL objects.
 */
export const removeFromSelection = async (...urls: (string | URL)[]) => {
	const parsedUrls = UrlsParameterSchema.parse(urls);

	let selection = await getSelection();

	selection = selection.filter((url) => !parsedUrls.includes(url));

	await storage.set(SELECTION_STORAGE_KEY, selection);
};

/**
 * Clears the selection in local storage.
 */
export const clearSelection = async () => {
	await storage.remove(SELECTION_STORAGE_KEY);
};
