#!/usr/bin/env node
import { build } from 'esbuild';
import { cp as copy, readdir, rm as remove, stat, readFile } from 'fs/promises';
import { join as joinPath } from 'path';

// Basically esbuild config for the stuff that's there (only one target allowed instead of an array)
const BUILD_CONFIG = {
	minify: true,
	sourcemap: 'inline',
	sourcesContent: true,
	target: 'firefox118'
};

const MANIFEST_PATH = 'src/manifest.json';

// Check if the manifest exists
try {
	const info = await stat(MANIFEST_PATH);
	if (!info.isFile()) throw new Error(`Manifest is not a file. (${MANIFEST_PATH})`);
} catch (error) {
	throw new Error(`Manifest not found. (${MANIFEST_PATH})`);
}

// Parse the manifest as JSON (may throw but fixing a broken manifest is out of scope)
const manifest = JSON.parse(await readFile(MANIFEST_PATH, { encoding: 'utf-8' }));

// Get paths to all files in a directory
const getAllFiles = async (dirPath, filter) => {
	const result = [];
	const directories = [dirPath];

	// Use a while loop to avoid recursion
	while (directories.length > 0) {
		const directory = directories.splice(0, 1)[0];
		const files = await readdir(directory);

		for (const file of files) {
			const filePath = joinPath(directory, file);
			const info = await stat(filePath);

			// Ignore symbolic links to avoid an endless loop
			if (info.isSymbolicLink()) continue;

			// Search subdirectories or determine if the file should get added to the result
			if (info.isDirectory()) {
				directories.push(filePath);
				continue;
			} else if (!filter || filter(filePath)) {
				result.push(filePath);
			}
		}
	}

	return result;
};

// Get all js files from the manifest and convert file suffixes to ts
const getManifestEntryPoints = () => {
	const content = manifest.content_scripts?.flatMap((cs) => cs.js).filter(Boolean) ?? [];
	const background = manifest.background?.scripts ?? [];

	return [...content, ...background].map((path) => {
		// Replace the last two characters with "ts" "script.js" -> "script.ts"
		path = path.substring(0, path.length - 2) + 'ts';

		// Convert the path to "src/extension/path"
		if (path.startsWith('./')) return 'src' + path.substring(1);
		if (path.startsWith('/')) return 'src' + path;
		return 'src/' + path;
	});
};

// Get all ts files from src/inject
const getInjectEntryPoints = async () => {
	return await getAllFiles('src/inject', (path) => path.endsWith('.ts'));
};

// Get all script.ts files from src/popup
const getPopupEntryPoints = async () => {
	return await getAllFiles('src/popup', (path) => path.endsWith('/script.ts'));
};

// Get all script.ts files from src/pages
const getPageEntryPoints = async () => {
	return await getAllFiles('src/pages', (path) => path.endsWith('/script.ts'));
};

// List of all entry points passed to esbuild
const entryPoints = [
	...getManifestEntryPoints(),
	...await getInjectEntryPoints(),
	...await getPopupEntryPoints(),
	...await getPageEntryPoints()
];

// Remove old build
await remove('build', { recursive: true, force: true });

// Build all entry points into build using esbuild
build({
	bundle: true,
	entryNames: '[dir]/[name]',
	entryPoints,
	minify: BUILD_CONFIG.minify,
	outbase: 'src',
	outdir: 'build',
	sourcemap: BUILD_CONFIG.sourcemap,
	sourcesContent: BUILD_CONFIG.sourcesContent,
	target: [BUILD_CONFIG.target]
});

// Copy all non ts files to build (src/types and src/lib are also excluded)
copy('src', 'build', {
	recursive: true,
	filter: (source, destination) => !source.endsWith('.ts') && !['src/types', 'src/lib'].includes(source)
});
