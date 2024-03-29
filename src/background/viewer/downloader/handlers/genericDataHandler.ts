import type { DownloadHandler } from '/src/lib/viewer';

const handler: DownloadHandler = {
	media: async (url) => {
		throw new Error(`Can't handle media. (${url})`);
	},
	data: (url) => new Promise((resolve, reject) => {
		fetch(url).then(response => response.blob()).then(blob => resolve({ source: url, blob })).catch(reject);
	})
};

export default handler;
// For convenient importing into other handlers
export const dataHandler = handler.data;
