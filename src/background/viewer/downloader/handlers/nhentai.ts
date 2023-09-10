import { z } from 'zod';
import genericDataHandler from './genericDataHandler';
import { DownloadHandler } from '/src/lib/viewer';

const fileTypes = {
	j: 'jpg',
	p: 'png',
	g: 'gif'
} as const;

const apiResponseSchema = z.object({
	title: z.object({
		pretty: z.string()
	}),
	media_id: z.string(),
	images: z.object({
		pages: z.array(z.object({
			t: z.enum(['j', 'p', 'g'])
		}))
	}),
	tags: z.array(z.object({
		name: z.string(),
		type: z.enum(['parody', 'character', 'tag', 'artist', 'group', 'language', 'category'])
	})),
});

const tagReplacements: {
	[key: string]: string;
} = {
	nakadashi: 'creampie'
};

const handler: DownloadHandler = {
	media: async (url) => {
		const galleryID = new URL(url).pathname.split('/').at(-2);

		const apiResponse = await fetch(`https://nhentai.net/api/gallery/${galleryID}`).then((response) => response.json());
		const parsedApiResponse = apiResponseSchema.parse(apiResponse);

		const tags: string[] = [];
		const creators: string[] = [];

		for (const tag of parsedApiResponse.tags) {
			switch (tag.type) {
				case 'artist':
				case 'group':
					creators.push(tag.name);
					break;

				case 'tag':
					tags.push(tagReplacements[tag.name] ?? tag.name);
					break;

				case 'language':
				case 'character':
				case 'parody':
					tags.push(tag.name);
					break;
			}
		}

		return {
			origin: url,
			name: parsedApiResponse.title.pretty,
			description: galleryID,
			type: 'manga',
			sources: parsedApiResponse.images.pages.map((page, i) => `https://i.nhentai.net/galleries/${parsedApiResponse.media_id}/${i + 1}.${fileTypes[page.t]}`),
			favorite: false,
			tags,
			creatorNames: creators
		};
	},
	data: genericDataHandler.data
};

export default handler;
