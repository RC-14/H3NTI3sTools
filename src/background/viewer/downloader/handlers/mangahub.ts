import { WebRequest, cookies, tabs, webRequest } from 'webextension-polyfill';
import { z } from 'zod';
import { COLLECTION_OS_NAME, CollectionSchema, DownloadHandler, createCollection, getFromObjectStore, getViewerIDB } from '/src/lib/viewer';

const API_URL = 'https://api.mghubcdn.com/graphql';
const IMG_URL_BASE = 'https://imgx.mghubcdn.com/';

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

const getAccessToken = async () => {
	let cookie = await cookies.get({ url: 'https://mangahub.io/', name: 'mhub_access' });
	
	if (cookie !== null) return cookie.value;

	await fetch('https://mangahub.io/');

	cookie = await cookies.get({ url: 'https://mangahub.io/', name: 'mhub_access' });

	if (cookie !== null) return cookie.value;

	throw new Error(`Couldn't get an access token for the mangahub api.`);
};

const seriesSlugFromUrl = (url: URL) => {
	return url.pathname.split('/').at(-2)!;
};

const chapterNumberFromUrl = (url: URL) => {
	return parseFloat(url.pathname.split('chapter-').at(-1)!);
};

const addToCollection = (chapterUrl: URL, seriesInfo: z.infer<typeof apiResponseSchema>['data']['manga']) => new Promise<void>(async (resolve, reject) => {
	const seriesName = seriesInfo.title;

	const collection = await getFromObjectStore(seriesName, COLLECTION_OS_NAME);
	const parsedCollection = CollectionSchema.safeParse(collection);

	if (!parsedCollection.success) {
		await createCollection(seriesName, [chapterUrl.href], {
			description: seriesInfo.description,
			image: IMG_URL_BASE + seriesInfo.image
		});
		resolve();
		return;
	}

	const sortArray: { origin: string, chapterNumber: number; }[] = [];

	for (const origin of parsedCollection.data.mediaOrigins) {
		sortArray.push({
			origin,
			chapterNumber: chapterNumberFromUrl(new URL(origin))
		});
	}
	sortArray.push({ origin: chapterUrl.href, chapterNumber: chapterNumberFromUrl(chapterUrl) });

	sortArray.sort((a, b) => a.chapterNumber - b.chapterNumber);

	parsedCollection.data.mediaOrigins = sortArray.map((entry) => entry.origin);

	const db = await getViewerIDB();
	const transaction = db.transaction(COLLECTION_OS_NAME, 'readwrite');
	const request = transaction.objectStore(COLLECTION_OS_NAME).put(parsedCollection.data);

	request.addEventListener('error', (event) => {
		db.close();
		reject(new Error(`[mangahub] Couldn't update collection ("${parsedCollection.data.name}"): ${request.error}`));
	});
	request.addEventListener('success', (event) => {
		db.close();
		resolve();
	});

	transaction.commit();
});

const handler: DownloadHandler = {
	media: async (urlString) => {
		const url = new URL(urlString);
		if (!url.pathname.startsWith('/chapter/')) throw new Error(`[mangahub] Not a chapter URL: ${urlString}`);
		
		const accessToken = await getAccessToken();
		const slug = seriesSlugFromUrl(url);
		const chapterNumber = chapterNumberFromUrl(url);

		const query = `{chapter(x:m01,slug:"${slug}",number:${chapterNumber}){pages}manga(x:m01,slug:"${slug}"){title,description,image}}`;

		const request = new Request(API_URL, {
			method: 'POST',
			body: JSON.stringify({ query }),
			referrerPolicy: 'no-referrer'
		});

		request.headers.set('Content-Type', 'application/json');
		request.headers.set(TOKEN_HEADER_NAME, validToken);
		request.headers.set('x-mhub-access', accessToken);

		const apiResponse = await fetch(request).then((response) => response.json());

		const parsedApiResponse = apiResponseSchema.parse(apiResponse);

		await addToCollection(url, parsedApiResponse.data.manga)

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
	data: async (url) => {
		return {
			source: url,
			blob: await fetch(url).then(response => response.blob())
		};
	}
};

export default handler;
