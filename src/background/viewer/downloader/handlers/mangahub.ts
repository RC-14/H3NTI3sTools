import { cookies, tabs, webRequest, type WebRequest } from 'webextension-polyfill';
import { z } from 'zod';
import { dataHandler } from './genericDataHandler';
import { type DownloadHandler } from '/src/lib/viewer';

const API_URL = 'https://api.mghcdn.com/graphql';
const IMG_URL_BASE = 'https://imgx.mghcdn.com/';
const ACCESS_TOKEN_URL = 'https://mangahub.io/';
const ACCESS_TOKEN_COOKIE_NAME = 'mhub_access';
let lastError = 0;
let mediaRetry = false;

/*
 * Set headers so that pixiv doesn't block the request.
 */
const TOKEN_HEADER_NAME = 'X-Hentie-Token-Mangahub';
let validToken = crypto.randomUUID();

webRequest.onBeforeSendHeaders.addListener((details) => {
	if (details.requestHeaders === undefined || !details.requestHeaders.some((header) => header.name === TOKEN_HEADER_NAME && header.value === validToken)) return;

	validToken = crypto.randomUUID();

	const headers: WebRequest.HttpHeaders = [
		{
			name: 'Origin',
			value: 'https://mangahub.io'
		},
		{
			name: 'Referer',
			value: 'https://mangahub.io'
		}
	];

	headers.push(...details.requestHeaders.filter((header) => header.name !== 'Origin' && header.name !== TOKEN_HEADER_NAME));

	return {
		requestHeaders: headers
	};
}, {
	urls: [
		API_URL
	],
	tabId: tabs.TAB_ID_NONE,
	types: [
		'xmlhttprequest'
	]
}, [
	'requestHeaders',
	'blocking'
]);

const apiResponseSchema = z.object({
	data: z.object({
		chapter: z.object({
			pages: z.string().transform((str) => z.object({
				p: z.string(),
				i: z.string().array()
			}).parse(JSON.parse(str)))
		}),
		manga: z.object({
			title: z.string(),
			description: z.string(),
			image: z.string()
		})
	})
});

const apiErrorResponseSchema = z.object({
	errors: z.array(z.object({
		message: z.string()
	}))
});

const getAccessToken = async () => {
	let cookie = await cookies.get({ url: ACCESS_TOKEN_URL, name: ACCESS_TOKEN_COOKIE_NAME });
	if (cookie !== null) return cookie.value;

	await fetch(ACCESS_TOKEN_URL);

	cookie = await cookies.get({ url: ACCESS_TOKEN_URL, name: ACCESS_TOKEN_COOKIE_NAME });
	if (cookie !== null) return cookie.value;

	throw new Error(`Couldn't get an access token for the mangahub api.`);
};

const clearAccessToken = async () => {
	await cookies.remove({ url: ACCESS_TOKEN_URL, name: ACCESS_TOKEN_COOKIE_NAME });
};

const setRecentlyCookie = async (chapterNumber: number) => {
	const now = Date.now();

	await cookies.set({
		url: ACCESS_TOKEN_URL,
		name: 'recently',
		value: encodeURIComponent(JSON.stringify({
			[now - Math.floor(Math.random() * 1200)]: {
				mangaID: Math.floor(Math.random() * 30000 + 1),
				number: chapterNumber
			}
		})),
		expirationDate: now / 1000 + 60 * 60 * 24 * 31 * 3
	});
};

const seriesSlugFromUrl = (url: URL) => {
	return url.pathname.split('/').at(-2)!;
};

const chapterNumberFromUrl = (url: URL) => {
	return parseFloat(url.pathname.split('chapter-').at(-1)!);
};

const handler: DownloadHandler = {
	media: async (urlString) => {
		const retry = mediaRetry;
		if (mediaRetry) mediaRetry = false;

		if (Date.now() - lastError < 1000 * 60 * 60) throw new Error(`Got an error in the last hour (${Math.floor((Date.now() - lastError) / 1000 / 60)} min).`);

		const url = new URL(urlString);
		if (!url.pathname.startsWith('/chapter/')) throw new Error(`[mangahub] Not a chapter URL: ${urlString}`);

		const accessToken = await getAccessToken();
		const slug = seriesSlugFromUrl(url);
		const chapterNumber = chapterNumberFromUrl(url);

		const query = `{chapter(x:m01,slug:"${slug}",number:${chapterNumber}){pages}manga(x:m01,slug:"${slug}"){title}}`;

		const request = new Request(API_URL, {
			method: 'POST',
			body: JSON.stringify({ query }),
			referrerPolicy: 'no-referrer'
		});

		request.headers.set('Content-Type', 'application/json');
		request.headers.set(TOKEN_HEADER_NAME, validToken);
		request.headers.set('x-mhub-access', accessToken);

		const apiResponse = await fetch(request).then((response) => response.json());

		const parsedApiErrorResponse = apiErrorResponseSchema.safeParse(apiResponse);

		if (parsedApiErrorResponse.success) {
			if (!retry) {
				await clearAccessToken();
				setRecentlyCookie(chapterNumber);
				mediaRetry = true;
				return await handler.media(urlString);
			}

			lastError = Date.now();
			throw new Error('Got an error back from the API: ' + parsedApiErrorResponse.data.errors.at(0)?.message);
		}

		const parsedApiResponse = apiResponseSchema.parse(apiResponse);

		return {
			origin: urlString,
			name: `${parsedApiResponse.data.manga.title} Chapter ${chapterNumber}`,
			type: 'webtoon',
			sources: parsedApiResponse.data.chapter.pages.i.map((e) => IMG_URL_BASE + parsedApiResponse.data.chapter.pages.p + e),
			favorite: false,
			tags: [],
			creatorNames: []
		};
	},
	data: dataHandler
};

export default handler;
