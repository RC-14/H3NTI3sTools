import type { DownloadHandler } from '/src/lib/viewer';

const handler: DownloadHandler = {
	media: async (url) => {
		throw new Error(`Can't handle media. (${url})`);
	},
	data: async (url) => {
		return {
			source: url,
			blob: await fetch(url).then(response => response.blob())
		};
	}
};

export default handler;
