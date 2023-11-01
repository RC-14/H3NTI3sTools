import { z } from 'zod';
import { dataHandler } from './genericDataHandler';
import { decode } from '/src/lib/htmlCharReferences';
import type { DownloadHandler } from '/src/lib/viewer';

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

const handler: DownloadHandler = {
	media: async (url) => {
		const apiUrl = new URL(url);
		apiUrl.pathname = '/api/v1' + apiUrl.pathname;

		const apiResponse = await fetch(apiUrl).then((response) => response.json());
		const parsedApiResponse = apiResponseSchema.parse(apiResponse);

		const attachments = parsedApiResponse.attachments.filter((item) => ['png', 'jpg', 'gif', 'webp'].includes(item.path.split('.').at(-1)!));

		if (attachments.length === 0) {
			if (parsedApiResponse.file.path === undefined) throw new Error(`No attachments for post: ${url}`);

			attachments.push({ path: parsedApiResponse.file.path });
		}

		const creatorUrl = new URL(url);
		creatorUrl.pathname = creatorUrl.pathname.split('/post/')[0]!;

		if (!creatorChache.has(creatorUrl.pathname)) {
			const html = await fetch(creatorUrl, {
				redirect: 'error'
			}).then((response) => response.text());

			const creator = html.split('<span itemprop="name">')[1]?.split('</span>')[0];
			if (creator === undefined) throw new Error(`Couldn't parse creator from kemono html.`);

			creatorChache.set(creatorUrl.pathname, creator);
		}

		return {
			origin: url,
			name: parsedApiResponse.title,
			description: decode(parsedApiResponse.content.replaceAll(/<[^>]+>/g, '')) || undefined,
			type: 'gallery',
			sources: attachments.map((item) => 'https://c1.kemono.party/data' + item.path),
			favorite: false,
			tags: [],
			creatorNames: [creatorChache.get(creatorUrl.pathname)!]
		};
	},
	data: (url) => new Promise((resolve, reject) => setTimeout(async () => resolve(await dataHandler(url)), 1_000))
};

export default handler;
