import { WebRequest, tabs, webRequest } from 'webextension-polyfill';
import { z } from 'zod';
import { DownloadHandler, Media, UrlSchema } from '/src/lib/viewer';
import { decode } from '/src/lib/htmlCharReferences';

/*
 * Set headers so that pixiv doesn't block the request.
 */
const TOKEN_HEADER_NAME = 'X-Hentie-Token';
let validToken = crypto.randomUUID();

webRequest.onBeforeSendHeaders.addListener((details) => {
	if (details.requestHeaders === undefined || !details.requestHeaders.some((header) => header.name === TOKEN_HEADER_NAME && header.value === validToken)) return;

	validToken = crypto.randomUUID();

	const headers: WebRequest.HttpHeaders = [
		{
			name: 'Referer',
			value: 'https://www.pixiv.net/'
		}
	];

	headers.push(...details.requestHeaders.filter((header) => header.name !== 'Referer'));

	return {
		requestHeaders: headers
	};
}, {
	urls: [
		'https://www.pixiv.net/ajax/*',
		'*://*.piximg.net/*',
		'*://*.pximg.net/*'
	],
	tabId: tabs.TAB_ID_NONE,
	types: [
		'xmlhttprequest'
	]
}, [
	'requestHeaders',
	'blocking'
]);

const types = [
	'gallery',
	'manga'
] as const;

const apiResponseSchema = z.object({
	body: z.union([
		z.never().array().length(0),
		z.object({
			title: z.string(),
			description: z.string(),
			illustType: z.union([
				z.literal(0), // Gallery
				z.literal(1), // Manga
				// TODO: z.literal(2) // Ugoira
			]),
			urls: z.object({
				original: UrlSchema
			}),
			pageCount: z.number(),
			tags: z.object({
				tags: z.array(z.object({
					tag: z.string(),
					romaji: z.string().optional(),
					translation: z.object({
						en: z.string()
					}).optional()
				}))
			}),
			userAccount: z.string()
		})
	]),
	error: z.boolean(),
	message: z.string()
});

const handler: DownloadHandler = {
	media: async (url) => {
		const illustID = new URL(url).pathname.split('/').at(-1);

		const apiResponse = await fetch(`https://www.pixiv.net/ajax/illust/${illustID}?lang=en`).then((response) => response.json());
		const parsedApiResponse = apiResponseSchema.parse(apiResponse);

		if (parsedApiResponse.error) {
			throw new Error(`Pixiv API request failed with message: ${parsedApiResponse.message}`);
		} else if (Array.isArray(parsedApiResponse.body)) {
			throw new Error('No body in response for pixiv API request.');
		}

		const sources = [
			parsedApiResponse.body.urls.original
		];

		for (let i = 1; i < parsedApiResponse.body.pageCount; i++) {
			sources.push(parsedApiResponse.body.urls.original.replace('_p0.', `_p${i}.`));
		}

		return {
			origin: url,
			name: parsedApiResponse.body.title,
			description: decode(parsedApiResponse.body.description.replaceAll(/<[^>]+>/g, '')),
			type: types[parsedApiResponse.body.illustType],
			sources,
			favorite: false,
			tags: parsedApiResponse.body.tags.tags.map((tag) => tag.translation?.en ?? tag.romaji ?? tag.tag),
			creatorNames: [parsedApiResponse.body.userAccount],
		} as Media;
	},
	data: async (url) => {
		const req = new Request(url);
		req.headers.set(TOKEN_HEADER_NAME, validToken);
		const blob = await fetch(req).then((response) => response.blob());

		return {
			source: url,
			blob
		};
	}
};

export default handler;
