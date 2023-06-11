import { z } from 'zod';

const SingleLineStringRefine: [(str: string) => boolean, string] = [(str) => !str.includes('\n'), "String can't have multiple lines."];

const NonEmptyStringSchema = z.string().nonempty();

export const IdSchema = z.string().uuid();
export type Id = z.infer<typeof IdSchema>;
export const NameSchema = NonEmptyStringSchema.trim().refine(...SingleLineStringRefine);
export type Name = z.infer<typeof NameSchema>;
export const DescriptionSchema = z.string();
export type Description = z.infer<typeof DescriptionSchema>;
export const UrlSchema = z.string().url();
export type Url = z.infer<typeof UrlSchema>;
export const MediaTypeSchema = z.enum(['gallery', 'manga', 'webtoon', 'video']);
export type MediaType = z.infer<typeof MediaTypeSchema>;
export const TagSchema = NonEmptyStringSchema.trim().toLowerCase().refine(...SingleLineStringRefine);
export type Tag = z.infer<typeof TagSchema>;

export const DataSchema = z.object({
	source: UrlSchema,
	blob: z.instanceof(Blob)
});
export type Data = z.infer<typeof DataSchema>;

export const MediaSchema = z.object({
	origin: UrlSchema, // Link to the website
	name: NameSchema,
	description: DescriptionSchema.optional(),
	image: UrlSchema.optional(), // Source of the cover/first image/thumbnail/...
	type: MediaTypeSchema,
	sources: UrlSchema.array().nonempty(), // Array of all sources (e.g. direct links to images/the video/...)
	favorite: z.boolean(),
	tags: TagSchema.array(),
	creatorNames: NameSchema.array() // Array of the IDs of all creators (may be empty if the creator is unknown)
});
type MediaBase = z.infer<typeof MediaSchema>;

export type GalleryMedia = {
	type: 'gallery';
} & MediaBase;
export type MangaMedia = {
	type: 'manga';
} & MediaBase;
export type WebtoonMedia = {
	type: 'webtoon';
} & MediaBase;
export type VideoMedia = {
	type: 'video';
	sources: [string];
} & MediaBase;
export type Media = GalleryMedia | MangaMedia | WebtoonMedia | VideoMedia;

export const CollectionSchema = z.object({
	id: IdSchema,
	name: NameSchema,
	description: DescriptionSchema.optional(),
	image: UrlSchema.optional(), // Source for cover or smth.
	mediaOrigins: UrlSchema.array() // Media IDs
});
export type Collection = z.infer<typeof CollectionSchema>;

export const ShowMediaMessageSchema = z.object({
	origins: UrlSchema.array(),
	targetTab: z.union([z.number().int(), z.null()]).optional() // If not set a new tab, if null the current tab and otherwise the tab with the respective ID.
});
export type ShowMediaMessage = z.infer<typeof ShowMediaMessageSchema>;

type PresentationNavigationDirection = "forward" | "backward"

export type MediaTypeHandler = {
	addContentToContentContainer: (media: Media, contentContainer: HTMLDivElement, getSrcForSource: (source: Url) => Promise<string>) => Promise<void>;
	preload: (media: Media, contentContainer: HTMLDivElement, direction: PresentationNavigationDirection) => void;
	presentMedia: (media: Media, contentContainer: HTMLDivElement, direction: PresentationNavigationDirection) => void;
	hideMedia: MediaTypeHandler['presentMedia'];
	presentationControlHandler: (media: Media, contentContainer: HTMLDivElement, event: KeyboardEvent) => boolean;
};

export type DownloadHandler = {
	media: (url: Url) => Promise<Media>,
	data: (url: Url) => Promise<Data>;
};
