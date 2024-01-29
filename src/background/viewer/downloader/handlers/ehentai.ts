import { z } from 'zod';
import { dataHandler } from './genericDataHandler';
import type { DownloadHandler } from '/src/lib/viewer';

const PAGE_URL_START = 'https://e-hentai.org/s/';
const FULLIMG_URL_START = 'https://e-hentai.org/fullimg/';

const apiResponseSchema = z.object({
	gmetadata: z.array(z.object({
		tags: z.array(z.string()),
		title: z.string()
	})).nonempty()
});

const tagReplacementMap: Map<string, string> = new Map();
tagReplacementMap.set('nakadashi', 'creampie');

const getGalleryHTMLs = async (url: URL): Promise<[string, ...string[]]> => {
	const galleryHTMLs: [string, ...string[]] = [await fetch(url).then(response => response.text())];

	const splitFirstGalleryHTML = galleryHTMLs[0].split(url.href + '?p=');
	if (splitFirstGalleryHTML.length === 1) return galleryHTMLs;

	const maxGalleryHTMLsIndex = parseInt(splitFirstGalleryHTML.at(-2)!.split('"', 1)[0]!);

	for (let i = 1; i <= maxGalleryHTMLsIndex; i++) {
		url.searchParams.set('p', `${i}`);
		galleryHTMLs.push(await fetch(url).then(response => response.text()));
	}

	url.search = '';

	return galleryHTMLs;
};

const getPageIDs = (galleryHTMLs: Awaited<ReturnType<typeof getGalleryHTMLs>>): string[] => {
	const pageIDs: string[] = [];

	for (const html of galleryHTMLs) {
		const splitHTML = html.split(PAGE_URL_START).splice(1);

		for (const chunk of splitHTML) pageIDs.push(chunk.split('"', 1)[0]!);
	}

	return pageIDs;
};

const getSourcesFromGalleryHTMLs = async (galleryHTMLs: Awaited<ReturnType<typeof getGalleryHTMLs>>): Promise<string[]> => {
	const pageIDs = getPageIDs(galleryHTMLs);

	const sources: string[] = [];

	for (const id of pageIDs) {
		const pageHTML = await fetch(PAGE_URL_START + id).then(response => response.text());

		const imgId = pageHTML.split(FULLIMG_URL_START).at(-1)!.split('"', 1)[0]!;

		sources.push(FULLIMG_URL_START + imgId);
	}

	return sources;
};

const getGalleryMetadata = async (galleryURL: URL) => {
	const [galleryID, galleryToken] = galleryURL.pathname.substring('/g/'.length).split('/');
	if (!galleryID || !galleryToken) throw new Error(`Invalid e-hentai gallery url: ${galleryURL.href}`);

	const request = new Request(`https://api.e-hentai.org/api.php`, {
		method: 'POST',
		body: `{"method":"gdata","gidlist":[[${galleryID}, "${galleryToken}"]],"namespace":1}`
	});

	try {
		const apiResponse = await fetch(request).then(response => response.json());
		const parsedApiResponse = apiResponseSchema.parse(apiResponse);
		return parsedApiResponse.gmetadata[0];
	} catch (error) { }

	// Wait 5 seconds in case it's the rate limit
	await new Promise(r => setTimeout(r, 5_000));

	const apiResponse = await fetch(request).then(response => response.json());
	const parsedApiResponse = apiResponseSchema.parse(apiResponse);
	return parsedApiResponse.gmetadata[0];
};

const handler: DownloadHandler = {
	media: async (urlString) => {
		const url = new URL(urlString);
		if (!url.pathname.startsWith('/g/')) throw new Error(`Not a e-hentai gallery url: ${urlString}`);

		url.search = '';
		url.hash = '';

		const galleryHTMLs = await getGalleryHTMLs(url);
		const sources = await getSourcesFromGalleryHTMLs(galleryHTMLs);

		const galleryMetadata = await getGalleryMetadata(url);

		const tags: string[] = [];
		const creatorNames: string[] = [];

		for (const tag of galleryMetadata.tags) {
			const [tagType, tagName] = tag.split(':') as [string, string];

			switch (tagType) {
				case 'artist':
				case 'group':
					creatorNames.push(tagName);
					break;

				default:
					tags.push(tagReplacementMap.get(tagName) ?? tagName);
					break;
			}
		}

		return {
			origin: urlString,
			name: galleryMetadata.title,
			type: 'manga',
			sources,
			favorite: false,
			tags,
			creatorNames,
		};
	},
	data: dataHandler
};

export default handler;
