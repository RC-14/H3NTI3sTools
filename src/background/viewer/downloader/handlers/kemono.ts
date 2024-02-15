import { z } from 'zod';
import { dataHandler } from './genericDataHandler';
import { decode } from '/src/lib/htmlCharReferences';
import type { Data, DownloadHandler, Media } from '/src/lib/viewer';

const ALLOWED_FILE_TYPES = ['png', 'jpg', 'gif', 'webp'];

const creatorChache = new Map<string, string>();

const apiResponseSchema = z.object({
	title: z.string(),
	content: z.string(),
	attachments: z.array(z.object({
		path: z.string()
	})),
	file: z.object({
		path: z.string().optional()
	})
});

const isAllowedFileType = (path: string) => ALLOWED_FILE_TYPES.includes(path.split('.').at(-1)!);

const mediaHandler = async (url: string): Promise<Media> => {
	const apiUrl = new URL(url);
	apiUrl.pathname = '/api/v1' + apiUrl.pathname;

	const apiResponse = await fetch(apiUrl).then((response) => response.json());
	const parsedApiResponse = apiResponseSchema.parse(apiResponse);

	const attachmentPaths = parsedApiResponse.attachments.filter((item) => isAllowedFileType(item.path)).map(item => item.path);
	if (
		parsedApiResponse.file.path !== undefined &&
		isAllowedFileType(parsedApiResponse.file.path) &&
		!attachmentPaths.includes(parsedApiResponse.file.path)
	) {
		attachmentPaths.unshift(parsedApiResponse.file.path);
	}

	if (attachmentPaths.length === 0) throw new Error(`No attachments for post: ${url}`);

	const creatorUrl = new URL(url);
	creatorUrl.pathname = creatorUrl.pathname.split('/post/')[0]!;

	if (!creatorChache.has(creatorUrl.pathname)) {
		const html = await fetch(creatorUrl, {
			redirect: 'error'
		}).then((response) => response.text());

		const creator = html.split('<span itemprop="name">')[1]?.split('</span>')[0]?.trim();
		if (creator === undefined || creator.length === 0) throw new Error(`Couldn't parse creator from kemono html.`);

		creatorChache.set(creatorUrl.pathname, creator);
	}

	return {
		origin: url,
		name: parsedApiResponse.title,
		description: decode(parsedApiResponse.content.replaceAll(/<[^>]+>/g, '')) || undefined,
		type: 'gallery',
		sources: attachmentPaths.map((path) => 'https://c1.kemono.party/data' + path),
		favorite: false,
		tags: [],
		creatorNames: [creatorChache.get(creatorUrl.pathname)!]
	};
};

const generateRateLimitedHandler = <T extends Media | Data>(handler: (url: string) => Promise<T>, maxReqPerSec: number) => {
	const delay = 1e3 / maxReqPerSec;
	return (url: string) => new Promise<T>((res, rej) => setTimeout(() => handler(url).then(res).catch(rej), delay));
};

const handler: DownloadHandler = {
	media: generateRateLimitedHandler(mediaHandler, 1),
	data: generateRateLimitedHandler(dataHandler, 1)
};

export default handler;
