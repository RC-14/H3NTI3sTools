import { z } from 'zod';

const SingleLineStringRefine: [(str: string) => boolean, string] = [(str) => !str.includes('\n'), "String can't have multiple lines."];

const NonEmptyTrimmedLowerCaseSingleLineStringSchema = z.string().min(1).trim().toLowerCase().refine(...SingleLineStringRefine);

export const NameSchema = NonEmptyTrimmedLowerCaseSingleLineStringSchema;
export type Name = z.infer<typeof NameSchema>;
export const DescriptionSchema = z.string();
export type Description = z.infer<typeof DescriptionSchema>;
export const UrlSchema = z.string().url();
export type Url = z.infer<typeof UrlSchema>;
export const MediaTypeSchema = z.enum(['gallery', 'manga', 'webtoon', 'video']);
export type MediaType = z.infer<typeof MediaTypeSchema>;
export const TagSchema = NonEmptyTrimmedLowerCaseSingleLineStringSchema;
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
	sources: UrlSchema.array(), // Array of all sources (e.g. direct links to images/the video/...)
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
} & MediaBase;
export type Media = GalleryMedia | MangaMedia | WebtoonMedia | VideoMedia;

export const CollectionSchema = z.object({
	name: NameSchema,
	description: DescriptionSchema.optional(),
	image: UrlSchema.optional(), // Source for cover or smth.
	mediaOrigins: UrlSchema.array()
});
export type Collection = z.infer<typeof CollectionSchema>;

export const ShowMediaMessageSchema = z.object({
	origins: UrlSchema.array(),
	targetTab: z.number().int() // A tab ID, -1 (no/new tab) or -2 (current tab)
});
export type ShowMediaMessage = z.infer<typeof ShowMediaMessageSchema>;

export type PresentationNavigationDirection = "forward" | "backward";

export type KeybindHandler = (media: Media, contentContainer: HTMLDivElement, event: KeyboardEvent) => boolean | void;
export type AddKeybindFunction = (trigger: string | { key: string, shift?: boolean, ctrl?: boolean; }, func: KeybindHandler) => void;
export type RemoveKeybindFunction = AddKeybindFunction;

export type MediaTypeHandler = {
	addContentToContentContainer: (media: Media, contentContainer: HTMLDivElement, getSrcForSource: (source: Url) => Promise<string>) => Promise<void>;
	preload: (media: Media, contentContainer: HTMLDivElement, direction: PresentationNavigationDirection) => void;
	presentMedia: (media: Media, contentContainer: HTMLDivElement, direction: PresentationNavigationDirection, addKeybind: AddKeybindFunction, setProgress: (progress?: number) => void, progress?: number) => void;
	hideMedia: (media: Media, contentContainer: HTMLDivElement, direction: PresentationNavigationDirection, removeKeybind: RemoveKeybindFunction) => void;
	autoProgressHandler: (media: Media, contentContainer: HTMLDivElement, direction: PresentationNavigationDirection) => boolean | Promise<void>;
};

export type DownloadHandler = {
	media: (url: Url) => Promise<Media>,
	data: (url: Url) => Promise<Data>;
};

export const AliasCategorySchema = z.record(NonEmptyTrimmedLowerCaseSingleLineStringSchema, NonEmptyTrimmedLowerCaseSingleLineStringSchema.array());
export type AliasCategory = z.infer<typeof AliasCategorySchema>;
export const AliasStorageSchema = z.record(NonEmptyTrimmedLowerCaseSingleLineStringSchema, AliasCategorySchema);
export type AliasStorage = z.infer<typeof AliasStorageSchema>;
