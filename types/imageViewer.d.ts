declare namespace ImageViewer {
	type Gallery = {
		sources: string[];
		type: 'paged' | 'scrolled';
		uuid?: ReturnType<Crypto['randomUUID']>;
		name?: string;
		info?: string;
		favorite?: boolean;
		tags?: string[];
		authorUuid?: Author['uuid'];
		creationDate?: ReturnType<DateConstructor['now']>;
		lastViewed?: ReturnType<DateConstructor['now']>;
	};

	type Author = {
		uuid: ReturnType<Crypto['randomUUID']>;
		name: string;
		info: string;
		avatar?: string;
	};
}
