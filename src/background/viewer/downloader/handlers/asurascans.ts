import { z } from 'zod';
import { decode } from '/src/lib/htmlCharReferences';
import { COLLECTION_OS_NAME, CollectionSchema, DownloadHandler, createCollection, getFromObjectStore, getViewerIDB } from '/src/lib/viewer';

const decodedHtmlEncodedStringSchema = z.string().transform((str, ctx) => decode(str));

const contentInfoSchema = z.object({
	sources: z.array(z.object({
		images: z.array(z.string().url())
	}))
});

const chapterInfoSchema = z.object({
	chapter_title: decodedHtmlEncodedStringSchema,
	manga_title: decodedHtmlEncodedStringSchema
});

const DISCORD_PROMOTION_URLS = [
	'https://www.asurascans.com/wp-content/uploads/2021/04/page100-10.jpg'
];

const getSourcesFromChapterHTML = (html: string) => {
	const contentInfoJSON = html.split('>ts_reader.run(').at(-1)!.split(');</script>')[0];
	const contentInfo = JSON.parse(contentInfoJSON);
	const parsedContentInfo = contentInfoSchema.parse(contentInfo);

	// Filter out discord promotions
	const sources = parsedContentInfo.sources[0].images.filter((source) => !DISCORD_PROMOTION_URLS.includes(source));

	return sources;
};

const getChapterInfoFromChapterHTML = (html: string) => {
	const historyParams = html.split('HISTORY.push(').at(-1)!.split(');')[0];
	const chapterInfoJson = historyParams.substring(historyParams.indexOf(',') + 1).trim();
	const chapterInfo = JSON.parse(chapterInfoJson);
	const parsedChapterInfo = chapterInfoSchema.parse(chapterInfo);

	return parsedChapterInfo;
};

const getSeriesUrlFromChapterHtml = (html: string) => {
	const url = html.split('class="allc">').at(-1)!.split('href="')[1].split('"')[0];
	const parsedUrl = z.string().url().parse(url);

	return parsedUrl;
};

const chapterNumberFromUrl = (url: string) => {
	const { pathname } = new URL(url);
	const path = pathname.split('/').filter(Boolean).at(-1)!;

	const parts = path.split('-');
	parts.splice(0, parts.indexOf('chapter') + 1);
	parts.splice(2);

	const num = parseFloat(parts.join('.'));
	if (isNaN(num)) throw new Error(`Got NaN as the chapter number which can't be. (${url})`);

	return num;
};

const addToCollection = (chapterUrl: string, seriesName: string, seriesUrl: string) => new Promise<void>(async (resolve, reject) => {
	const collection = await getFromObjectStore(seriesName, COLLECTION_OS_NAME);
	const parsedCollection = CollectionSchema.safeParse(collection);

	if (!parsedCollection.success) {
		const html = await fetch(seriesUrl).then((response) => response.text());

		const parser = new DOMParser();
		const doc = parser.parseFromString(html, 'text/html');

		const descriptionElement = doc.querySelector<HTMLDivElement>('div[itemprop="description"]');
		const imageElement = doc.querySelector<HTMLImageElement>('[itemprop="image"] > img');

		if (!(
			descriptionElement instanceof HTMLDivElement &&
			imageElement instanceof HTMLImageElement
		)) throw new Error(`Didn't get the right elements ("${seriesName}": ${seriesUrl}): ${descriptionElement} ${imageElement}`);

		await createCollection(seriesName, [chapterUrl], {
			description: descriptionElement.innerText.trim(),
			image: imageElement.src
		});

		resolve();
		return;
	}

	parsedCollection.data.mediaOrigins.push(chapterUrl);
	parsedCollection.data.mediaOrigins.sort((a, b) => chapterNumberFromUrl(a) - chapterNumberFromUrl(b));

	const db = await getViewerIDB();
	const transaction = db.transaction(COLLECTION_OS_NAME, 'readwrite');
	const request = transaction.objectStore(COLLECTION_OS_NAME).put(parsedCollection.data);

	request.addEventListener('error', (event) => {
		db.close();
		reject(request.error);
	});
	request.addEventListener('success', (event) => {
		db.close();
		resolve();
	});

	transaction.commit();
});

const handler: DownloadHandler = {
	media: async (url) => {
		const chapterHtml = await fetch(url).then((response) => response.text());
		const chapterInfo = getChapterInfoFromChapterHTML(chapterHtml);

		const seriesUrl = getSeriesUrlFromChapterHtml(chapterHtml);
		await addToCollection(url, chapterInfo.manga_title, seriesUrl);

		return {
			origin: url,
			name: chapterInfo.chapter_title,
			type: 'webtoon',
			sources: getSourcesFromChapterHTML(chapterHtml),
			favorite: false,
			tags: [],
			creatorNames: []
		};
	},
	data: async (url) => {
		return {
			source: url,
			blob: await fetch(url).then((response) => response.blob())
		};
	}
};

export default handler;
