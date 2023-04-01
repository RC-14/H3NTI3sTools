declare namespace ImageViewer {
	type Gallery = {
		uuid: string; // technically ReturnType<Crypto['randomUUID']> but it's impossible to check if a string fulfils that
		name: string;
		info: string;
		favorite: boolean;
		sources: string[];
		type: 'paged' | 'scrolled';
		tags: string[];
		authorUuid: Author['uuid'];
		creationDate: ReturnType<DateConstructor['now']>;
		lastViewed: ReturnType<DateConstructor['now']>;
	};

	type Author = {
		uuid: string; // same as Gallery.uuid
		name: string;
		info: string;
		avatar?: string;
	};
}
