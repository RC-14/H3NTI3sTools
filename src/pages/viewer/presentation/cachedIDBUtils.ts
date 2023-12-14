// TODO: Completely handle this in the background script

import { sendRuntimeMessage } from '/src/lib/utils';
import { DATA_OS_NAME, DataSchema, MEDIA_OS_NAME, MediaSchema, UrlSchema, getFromObjectStore, type Media, type Url } from '/src/lib/viewer';

const dataSrcMap = new Map<string, string>();
const mediaMap = new Map<Media['origin'], Media>();

export const getMediaInfo = (origin: string) => new Promise<Media>(async (resolve, reject) => {
	const parsedOrigin = UrlSchema.safeParse(origin);

	if (!parsedOrigin.success) {
		reject(new Error(`${origin} is not a valid id: ${parsedOrigin.error}`));
		return;
	}

	if (mediaMap.has(parsedOrigin.data)) {
		resolve(mediaMap.get(parsedOrigin.data)!);
		return;
	}

	let result = await getFromObjectStore(parsedOrigin.data, MEDIA_OS_NAME);

	if (result === undefined) {
		const answer = await sendRuntimeMessage('background', 'viewer', 'downloadMedia', parsedOrigin.data);

		if (typeof answer !== 'boolean') {
			reject(new Error(`Expected a boolean as an answer but got typeof ${typeof answer}`));
			return;
		} else if (!answer) {
			reject(new Error(`Got an id for a nonexistent media: ${parsedOrigin.data}`));
			return;
		}

		result = await getFromObjectStore(parsedOrigin.data, MEDIA_OS_NAME);
	}

	const parsedResult = MediaSchema.safeParse(result);

	if (!parsedResult.success) {
		reject(new Error(`Got an invalid object from indexedDB (origin: ${origin}): ${parsedResult.error}`));
		return;
	}

	mediaMap.set(parsedOrigin.data, parsedResult.data as Media);

	resolve(parsedResult.data as Media);
});

export const getUsableSrcForSource = (source: Url) => new Promise<string>(async (resolve, reject) => {
	const parsedSource = UrlSchema.safeParse(source);

	if (!parsedSource.success) {
		reject(new Error(`${source} is not a valid source: ${parsedSource.error}`));
		return;
	}

	if (dataSrcMap.has(parsedSource.data)) {
		resolve(dataSrcMap.get(parsedSource.data)!);
		return;
	}

	let result = await getFromObjectStore(parsedSource.data, DATA_OS_NAME);

	if (result === undefined) {
		const answer = await sendRuntimeMessage('background', 'viewer', 'downloadData', parsedSource.data);

		if (typeof answer !== 'boolean') {
			reject(new Error(`Expected a boolean as an answer but got typeof ${typeof answer}`));
			return;
		} else if (!answer) {
			reject(new Error(`Couldn't download blob for source: ${parsedSource.data}`));
			return;
		}

		result = await getFromObjectStore(parsedSource.data, DATA_OS_NAME);
	}

	const parsedResult = DataSchema.safeParse(result);

	if (!parsedResult.success) {
		reject(new Error(`Got an invalid object from indexedDB (source: ${source}): ${parsedResult.error}`));
		return;
	}

	const objectUrl = URL.createObjectURL(parsedResult.data.blob);

	dataSrcMap.set(parsedSource.data, objectUrl);
	resolve(objectUrl);
});
