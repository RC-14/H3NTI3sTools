namespace Pixiv {
	interface APIResponse {
		error: boolean;
		message: string;
		body: jsonObject;
	}

	type UserInfo = {
		userId: number; // userId
		userName: string; // name
		profilePicture: string; // imageBig
		lastFetch: number; // Date.now() on successfull fetch and try updating when too old and new image from artist gets loaded
	};

	type IllustrationInfo = {
		illustId: number; // illustId
		title: string; // illustTitle
		description: string; // illustComment
		tags: string[]; // tags.tags.tag[] (userId === artistUserId)
		uploadDate: number; // Date.parse(uploadDate)
		userId: UserInfo['userId']; // userId - index
		pages: { thumb: string, original: string, overwrite?: string; }[]; // use original if overwrite is undefined, don't load image if overwrite is empty
	};
}