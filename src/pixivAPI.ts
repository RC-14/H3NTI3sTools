import { isValidUrl, htmlCharRef } from './utils.js';

export const fetchIllustrationInfo = async (id: Pixiv.IllustrationInfo['illustId']): Promise<Pixiv.IllustrationInfo> => {
	// Actually request the information
	const response = await fetch(`https://www.pixiv.net/ajax/illust/${id}?lang=en`);
	const apiResponse: Pixiv.APIResponse = await response.json();

	// If an error occured throw it - YEET
	if (apiResponse.error) throw new Error(`API call for illustId "${id}" failed with message: ${apiResponse.message}`);

	// Check if we got a title
	if (typeof apiResponse.body.illustTitle !== 'string') throw new Error(`API response for illstId "${id}" doesn't contain a title.`);

	// Check if we got a description
	if (typeof apiResponse.body.illustComment !== 'string') throw new Error(`API response for illstId "${id}" doesn't contain a description.`);

	// Check if we got an upload date
	if (typeof apiResponse.body.uploadDate !== 'string') throw new Error(`API response for illstId "${id}" doesn't contain an upload date.`);
	const uploadDate = Date.parse(apiResponse.body.uploadDate);
	if (isNaN(uploadDate)) throw new Error(`API response for illstId "${id}" doesn't contain a valid upload date.`);

	// Check if we got a userId
	if (typeof apiResponse.body.userId !== 'string') throw new Error(`API response for illstId "${id}" doesn't contain an user id.`);
	const userId = parseInt(apiResponse.body.userId);
	if (isNaN(userId)) throw new Error(`API response for illstId "${id}" doesn't contain a valid user id.`);

	// Check if we got tags
	if (typeof apiResponse.body.tags !== 'object' || Array.isArray(apiResponse.body.tags) || apiResponse.body.tags === null) throw new Error(`API response for illustId "${id}" doesn't contain a tags object.`);
	if (typeof apiResponse.body.tags.tags !== 'object' || !Array.isArray(apiResponse.body.tags.tags)) throw new Error(`API response for illustId "${id}" doesn't contain a tags array.`);
	const tags: Pixiv.IllustrationInfo['tags'] = [];

	for (const tag of apiResponse.body.tags.tags) {
		if (typeof tag !== 'object' || Array.isArray(tag) || tag === null) throw new Error(`API response for illustId "${id}" contains an invalid tag.`);

		// Check if the tag was set by the artist
		if (typeof tag.userId !== 'string') continue;
		if (parseInt(tag.userId) !== userId) continue;

		if (typeof tag.translation === 'object' && tag.translation !== null && !Array.isArray(tag.translation)) {
			if (typeof tag.translation.en === 'string') {
				if (tags.includes(tag.translation.en)) continue;

				tags.push(tag.translation.en);
				continue;
			}
		}

		if (typeof tag.romaji === 'string') {
			if (tags.includes(tag.romaji)) continue;

			tags.push(tag.romaji);
			continue;
		}

		if (typeof tag.tag !== 'string') throw new Error(`API response for illustId "${id}" contains a tag without string representation.`);

		if (tags.includes(tag.tag)) continue;
		// ignore R ratings
		if (tag.tag.match(/^R-\d+G?$/)) continue;
		tags.push(tag.tag);
	}

	// Check if we got a pageCount
	if (typeof apiResponse.body.pageCount !== 'number') throw new Error(`API response for illustId "${id}" doesn't contain a page count.`);

	// Check if we got urls
	if (typeof apiResponse.body.urls !== 'object' || Array.isArray(apiResponse.body.urls) || apiResponse.body.urls === null) throw new Error(`API response for illustId "${id}" doesn't contain a urls object.`);
	if (typeof apiResponse.body.urls.thumb !== 'string') throw new Error(`API response for illustId "${id}" doesn't contain a string for thumb.`);
	if (typeof apiResponse.body.urls.original !== 'string') throw new Error(`API response for illustId "${id}" doesn't contain a string for original.`);
	if (!isValidUrl(apiResponse.body.urls.thumb)) throw new Error(`API response for illustId "${id}" doesn't contain a valid URL for thumb.`);
	if (!isValidUrl(apiResponse.body.urls.original)) throw new Error(`API response for illustId "${id}" doesn't contain a valid URL for original.`);

	const pages: Pixiv.IllustrationInfo['pages'] = [];

	for (let i = 0; i < apiResponse.body.pageCount; i++) {
		const thumb = new URL(apiResponse.body.urls.thumb);
		const original = new URL(apiResponse.body.urls.original);

		thumb.pathname = thumb.pathname.replace('_p0', `_p${i}`);
		original.pathname = original.pathname.replace('_p0', `_p${i}`);

		pages.push({ thumb: thumb.href, original: original.href });
	}

	return {
		illustId: id,
		title: htmlCharRef.decode(apiResponse.body.illustTitle),
		description: htmlCharRef.decode(apiResponse.body.illustComment),
		tags,
		uploadDate,
		userId,
		pages
	};
};

export const fetchUserInfo = async (id: Pixiv.UserInfo['userId']): Promise<Pixiv.UserInfo> => {
	// Actually request the information
	const response = await fetch(`https://www.pixiv.net/ajax/user/${id}?lang=en`);
	const apiResponse: Pixiv.APIResponse = await response.json();

	// If an error occured throw it - YEET
	if (apiResponse.error) throw new Error(`API call for userId "${id}" failed with message: ${apiResponse.message}`);

	if (typeof apiResponse.body.name !== 'string') throw new Error(`API response for userId "${id}" doesn't contain a user name.`);

	if (typeof apiResponse.body.imageBig !== 'string') throw new Error(`API response for userId "${id}" doesn't contain a string for imageBig.`);
	if (!isValidUrl(apiResponse.body.imageBig)) throw new Error(`API response for userId "${id}" doesn't contain a valid URL for imageBig.`);

	return {
		userId: id,
		userName: htmlCharRef.decode(apiResponse.body.name),
		profilePicture: apiResponse.body.imageBig,
		lastFetch: Date.now()
	};
};
