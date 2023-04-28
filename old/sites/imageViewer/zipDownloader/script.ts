import { ZipReader, BlobReader, Data64URIWriter } from '../../../node_modules/@zip.js/zip.js/index.js';

const isMacOSTrash = (path: string) => {
	const pathParts = path.split('/').filter(Boolean);

	if (pathParts.includes('__MACOSX')) return true;
	if (pathParts.at(-1) === '.DS_Store') return true;
	if (pathParts.at(-1)?.startsWith('._')) return true;

	return false;
};

/*
 * Basic prototype code
 */

const url = 'https://c3.kemono.party/data/6a/55/6a55289a563096c1de69d68826684df3462c0809aab8b7e982bb6e4e7b7e9771.zip';

console.log(`Loading '${url}'`);

const zipBlob = await fetch(url).then(r => r.blob());

// create a BlobReader to read with a ZipReader the zip from a Blob object
const reader = new ZipReader(new BlobReader(zipBlob));

// get all entries from the zip
const entries = await reader.getEntries({ filenameEncoding: 'utf-8' });
if (entries.length) {
	console.log('Unzipping...');

	const fileDateURLPromises: Promise<string>[] = [];

	for (const entry of entries) {
		if (entry.directory) continue;
		if (isMacOSTrash(entry.filename)) continue;

		console.log(entry.filename);
		fileDateURLPromises.push(entry.getData(new Data64URIWriter()));
	}

	const filesDataURLs = await Promise.all(fileDateURLPromises);

	console.log('Unzipped files:', filesDataURLs);

	filesDataURLs.forEach((url) => document.body.append(Object.assign(document.createElement('img'), { src: url })));
} else {
	console.log('Empty Zip');
}

await reader.close();
