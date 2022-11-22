namespace PixivViewer {
	type PixivArtwork = {
		pixivId: Pixiv.IllustrationInfo['illustId'];
		exclude?: number[];
		overwrite?: (string | null)[];
		ignoreOverwrite?: boolean;
	}

	type Artwork = string | PixivArtwork;

	type Base64Image = {
		sourceUrl: string; // url where the image was downloaded from
		b64Data: string; // base64 encoded image
		date: number; // Date.now() when downloaded
		expiryDate: number; // -1 if it doesn't expire and otherwise Date.now() + 1 week on last access
	};

	type ShowMessageData = {
		tabId?: chrome.tabs.Tab['id'] | null;
		artwork?: Artwork;
	}
}
