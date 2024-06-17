import { z } from 'zod';
import { dataHandler } from './genericDataHandler';
import type { DownloadHandler } from '/src/lib/viewer';

const chapterInfoSchema = z.object({
	props: z.object({
		pageProps: z.object({
			chapter: z.object({
				md_images: z.array(z.object({
					b2key: z.string()
				}))
			}),
			seoTitle: z.string()
		})
	})
});

const getChapterInfoFromChapterHTML = (html: string) => {
	const chapterInfoJson = html.match(/<script [^>]*id="__NEXT_DATA__"[^>]*>([^<]+)<\/script/)?.[1];
	if (!chapterInfoJson) throw new Error("Couldn't find info JSON in Comick chapter HTML.");

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
			name: chapterInfo.props.pageProps.seoTitle,
			type: 'webtoon',
			sources: chapterInfo.props.pageProps.chapter.md_images.map((imgInfo) => `https://meo.comick.pictures/${imgInfo.b2key}`),
			favorite: false,
			tags: [],
			creatorNames: []
		};
	},
	data: dataHandler
};

export default handler;
