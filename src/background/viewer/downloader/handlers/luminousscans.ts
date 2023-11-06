import { z } from 'zod';
import { dataHandler } from './genericDataHandler';
import { decode } from '/src/lib/htmlCharReferences';
import { COLLECTION_OS_NAME, CollectionSchema, MEDIA_OS_NAME, MediaSchema, createCollection, getFromObjectStore, getViewerIDB, type DownloadHandler } from '/src/lib/viewer';

const decodedHtmlEncodedStringSchema = z.string().transform((str, ctx) => decode(str));

const contentInfoSchema = z.object({
	sources: z.array(z.object({
		images: z.array(z.string().url()).nonempty()
	}))
});

const chapterInfoSchema = z.object({
	chapter_title: decodedHtmlEncodedStringSchema,
	manga_title: decodedHtmlEncodedStringSchema
});

const getSourcesFromChapterHTML = (html: string) => {
	const contentInfoJSON = html.split('>ts_reader.run(').at(-1)!.split(');</script>')[0];
	if (contentInfoJSON === undefined) throw new Error(`Couldn't parse luminousscans chapter html for sources.`);

	const contentInfo = JSON.parse(contentInfoJSON);
	const parsedContentInfo = contentInfoSchema.parse(contentInfo);

	return parsedContentInfo.sources[0]!.images;
};

const getChapterInfoFromChapterHTML = (html: string) => {
	const historyParams = html.split('HISTORY.push(').at(-1)!.split(');')[0];
	if (historyParams === undefined) throw new Error(`Couldn't parse luminousscans chapter html for info.`);

	const chapterInfoJson = historyParams.substring(historyParams.indexOf(',') + 1).trim();
	const chapterInfo = JSON.parse(chapterInfoJson);
	const parsedChapterInfo = chapterInfoSchema.parse(chapterInfo);

	return parsedChapterInfo;
};

const getSeriesUrlFromChapterHtml = (html: string) => {
	const url = html.split('class="allc">').at(-1)!.split('href="')[1]?.split('"')[0];
	if (url === undefined) throw new Error(`Couldn't parse luminousscans chapter html for series url.`);

	const parsedUrl = z.string().url().parse(url);

	return parsedUrl;
};

const chapterNumberFromTitle = (title: string) => {
	const lowerCaseTitle = title.toLowerCase();
	const afterChapter = lowerCaseTitle.split('chapter')[1];
	if (afterChapter === undefined) throw new Error(`Couldn't parse luminousscans chapter number from title. (doesn't contain "chapter")`);

	const beforeDash = afterChapter.split('-')[0];
	if (beforeDash === undefined) throw new Error(`Couldn't parse luminousscans chapter number from title. (doesn't contain "-")`);

	return parseFloat(beforeDash.trim());
};

const getSeriesInfo = async (seriesUrl: string) => {
	const html = await fetch(seriesUrl).then((response) => response.text());

	const parser = new DOMParser();
	const doc = parser.parseFromString(html, 'text/html');

	const descriptionElement = doc.querySelector<HTMLDivElement>('div[itemprop="description"]');
	const imageElement = doc.querySelector<HTMLImageElement>('[itemprop="image"] > img');

	if (!(
		descriptionElement instanceof HTMLDivElement &&
		imageElement instanceof HTMLImageElement
	)) throw new Error(`Didn't get the right elements ("${seriesUrl}"): ${descriptionElement} ${imageElement}`);

	return {
		description: descriptionElement.innerText.trim(),
		image: imageElement.src
	};
};

const addToCollection = (chapterUrl: string, chapterTitle: string, seriesName: string, seriesUrl: string) => new Promise<void>(async (resolve, reject) => {
	const collection = await getFromObjectStore(seriesName, COLLECTION_OS_NAME);
	const parsedCollection = CollectionSchema.safeParse(collection);

	if (!parsedCollection.success) {
		const seriesInfo = await getSeriesInfo(seriesUrl);

		await createCollection(seriesName, [chapterUrl], seriesInfo);

		resolve();
		return;
	}

	const sortArray: { origin: string, chapterNumber: number; }[] = [];

	const promises: Promise<void>[] = [];

	for (const origin of parsedCollection.data.mediaOrigins) {
		sortArray.push({
			origin,
			chapterNumber: chapterNumberFromTitle(chapterTitle)
		});

		const entry = sortArray.at(-1)!;

		if (!isNaN(entry.chapterNumber)) continue;

		promises.push(new Promise(async (resolve, reject) => {
			const media = await getFromObjectStore(origin, MEDIA_OS_NAME);
			const parsedMedia = MediaSchema.safeParse(media);

			if (!parsedMedia.success) {
				resolve();
				return;
			}

			entry.chapterNumber = chapterNumberFromTitle(parsedMedia.data.name);

			if (isNaN(entry.chapterNumber)) entry.chapterNumber = -1;

			resolve();
		}));
	}

	await Promise.all(promises);

	let chapterNumber = chapterNumberFromTitle(chapterTitle);
	if (isNaN(chapterNumber)) chapterNumber = -1;

	sortArray.push({ origin: chapterUrl, chapterNumber });

	sortArray.sort((a, b) => a.chapterNumber - b.chapterNumber);

	parsedCollection.data.mediaOrigins = sortArray.map((entry) => entry.origin);

	const db = await getViewerIDB();
	const transaction = db.transaction(COLLECTION_OS_NAME, 'readwrite');
	const request = transaction.objectStore(COLLECTION_OS_NAME).put(parsedCollection.data);

	request.addEventListener('error', (event) => {
		db.close();
		reject(new Error(`[luminousscans] Couldn't update collection ("${parsedCollection.data.name}"): ${request.error}`));
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
		await addToCollection(url, chapterInfo.chapter_title, chapterInfo.manga_title, seriesUrl);

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
	data: dataHandler
};

export default handler;
