import { z } from 'zod';
import { dataHandler } from './genericDataHandler';
import { decode } from '/src/lib/htmlCharReferences';
import { type DownloadHandler } from '/src/lib/viewer';

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

const PROMOTION_URLS = [
	'https://www.asurascans.com/wp-content/uploads/2021/04/page100-10.jpg',
	'https://asura.nacm.xyz/wp-content/uploads/2023/05/EndDesignPSD02.png',
	'https://asuracomics.com/wp-content/uploads/2023/05/EndDesignPSD02.png'
];

const getSourcesFromChapterHTML = (html: string) => {
	const contentInfoJSON = html.split('ts_reader.run(').at(-1)!.split(');')[0];
	if (contentInfoJSON === undefined) throw new Error(`Couldn't parse asurascans chapter html for sources.`);

	const contentInfo = JSON.parse(contentInfoJSON);
	const parsedContentInfo = contentInfoSchema.parse(contentInfo);

	// Filter out discord promotions
	const sources = parsedContentInfo.sources[0]!.images.filter((source) => !PROMOTION_URLS.includes(source));

	return sources;
};

const getChapterInfoFromChapterHTML = (html: string) => {
	const historyParams = html.split('HISTORY.push(').at(-1)!.split(');')[0];
	if (historyParams === undefined) throw new Error(`Couldn't parse asurascans chapter html for info.`);

	const chapterInfoJson = historyParams.substring(historyParams.indexOf(',') + 1).trim();
	const chapterInfo = JSON.parse(chapterInfoJson);
	const parsedChapterInfo = chapterInfoSchema.parse(chapterInfo);

	return parsedChapterInfo;
};

const handler: DownloadHandler = {
	media: async (url) => {
		const chapterHtml = await fetch(url).then((response) => response.text());
		const chapterInfo = getChapterInfoFromChapterHTML(chapterHtml);

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
