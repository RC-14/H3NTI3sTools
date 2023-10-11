const BROWSING_PATHS = ['', 'artist', 'artists', 'category', 'character', 'characters', 'group', 'groups', 'language', 'parodies', 'parody', 'tag', 'tags'];

/**
 * Determines the current state of the website.
 * 
 * @returns One of `browsing`, `reading`, `lookingAtGallery`, `searching` or `unknown`.
 */
const getState = () => {
	const pathParts = location.pathname.split('/').splice(1);

	if (pathParts.length === 0 || BROWSING_PATHS.includes(pathParts[0]!)) {
		return 'browsing';
	}

	if (location.pathname.startsWith('/g/')) {
		if (location.pathname.match(/^\/g\/\d+\/\d+\/$/) !== null) return 'reading';

		return 'lookingAtGallery';
	}

	if (location.pathname.startsWith('/search/') && location.search !== '') {
		return 'searching';
	}

	return 'unknown';
};

export default getState();
