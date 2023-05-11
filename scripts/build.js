#!/usr/bin/env node
import { build } from 'esbuild';
import { cp as copy, readdir, rm as remove, stat } from 'fs/promises';
import { join as joinPath } from 'path';
import manifest from '../src/manifest.json' assert { type: 'json' };

const getAllFiles = async (dirPath) => {
	const result = [];
	const directories = [dirPath];

	while (directories.length > 0) {
		const directory = directories.splice(0, 1)[0];
		const files = await readdir(directory);

		for (const file of files) {
			const filePath = joinPath(directory, file);
			const isDir = (await stat(filePath)).isDirectory();

			if (isDir) {
				directories.push(filePath);
				continue;
			}

			result.push(filePath);
		}
	}

	return result;
};

const getAllTSFiles = async (dirPath) => {
	return (await getAllFiles(dirPath)).filter((path) => path.endsWith('.ts'));
};

const getAllNonTSFiles = async (dirPath) => {
	return (await getAllFiles(dirPath)).filter((path) => !path.endsWith('.ts'));
};

const getManifestEntryPoints = () => {
	const content = manifest.content_scripts?.flatMap((cs) => cs.js).filter(Boolean) ?? [];
	const background = manifest.background?.scripts ?? [];

	return [...content, ...background].map((path) => {
		path = path.substring(0, path.length - 2) + 'ts';
		if (path.startsWith('./')) return 'src' + path.substring(1);
		if (path.startsWith('/')) return 'src' + path;
		return 'src/' + path;
	});
};

const getInjectEntryPoints = async () => {
	return await getAllTSFiles('src/inject');
};

const getPageEntryPoints = async () => {
	return await getAllTSFiles('src/pages');
};

const entryPoints = [
	...getManifestEntryPoints(),
	...await getInjectEntryPoints(),
	...await getPageEntryPoints()
];

await remove('build', { recursive: true, force: true });

build({
	bundle: true,
	entryNames: '[dir]/[name]',
	entryPoints,
	minify: true,
	outbase: 'src',
	outdir: 'build',
	sourcemap: 'inline',
	target: ['firefox112']
});

copy('src', 'build', {
	errorOnExist: true,
	recursive: true,
	filter: (source, destination) => !source.endsWith('.ts') && !['src/types', 'src/lib'].includes(source)
});
