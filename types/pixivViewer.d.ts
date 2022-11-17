namespace PixivViewer {
	interface PixivArtwork {
		pixivId: Pixiv.IllustrationInfo['illustId'];
		exclude?: number[];
		overwrite?: (string | null)[];
	}

	type Artwork = string | PixivArtwork;

	interface Base64Image {
		sourceUrl: string; // url where the image was downloaded from
		b64Data: string; // base64 encoded image
		date: number; // Date.now() when downloaded
	};
}
