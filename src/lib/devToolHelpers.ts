import { qs, qsa } from '/src/lib/utils';
import type { GalleryMedia } from '/src/lib/viewer';

const writeToPageContext = (key: string, value: unknown) => {
	// @ts-ignore
	const unsafeWindow: Window = window.wrappedJSObject ?? window;

	Object.defineProperty(unsafeWindow, key, {
		configurable: false,
		enumerable: false,
		writable: false,
		// @ts-ignore
		value: 'cloneInto' in globalThis ? cloneInto(value, unsafeWindow, { cloneFunctions: true }) : value
	});
};

let addedHelperFunctions = false;

writeToPageContext('h3nti3Utils', {
	addHelperFunctionsToWindow: () => {
		if (addedHelperFunctions) return;
		addedHelperFunctions = true;

		writeToPageContext('qs', qs);
		writeToPageContext('qsa', qsa);
		writeToPageContext('debugH3NTI3sTools', () => { debugger; });
	},
	nhentaiMediaSortCompareFunction: (a: GalleryMedia, b: GalleryMedia) => {
		const aCreatorString = a.creatorNames.map(e => e.toLowerCase()).sort().join('\n');
		const bCreatorString = b.creatorNames.map(e => e.toLowerCase()).sort().join('\n');
		if (aCreatorString !== bCreatorString) return aCreatorString > bCreatorString;

		const aLowerCaseName = a.name.toLowerCase();
		const bLowerCaseName = b.name.toLowerCase();
		if (aLowerCaseName === bLowerCaseName) return a.origin.toLowerCase() > b.origin.toLowerCase();

		const aNames = aLowerCaseName.split(' | ');
		const bNames = bLowerCaseName.split(' | ');

		if (aNames.length === 1 && bNames.length === 1) return aLowerCaseName > bLowerCaseName;
		if (aNames.length === 1 || bNames.length === 1) {
			let [x, y]: (string[] | { value: string, equality: number, length: number; })[] = [aNames, bNames].sort((a, b) => Number(a.length > b.length));
			const xLowerCaseName = x!.join(' | ');
			y = y!.map((value, index, array) => {
				let equality = 0;
				const length = Math.min(xLowerCaseName!.length, value.length);
				for (let i = 0; i < length; i++) {
					if (aLowerCaseName[i] !== value[i]) break;
					equality++;
				}
				return { equality, length: value.length, value };
			}).reduce((a, c) => {
				if (a.equality < c.equality) return c;
				if (a.equality > c.equality) return a;
				if (a.length < c.length) return a;
				return c;
			});
			const yLowerCaseName = y.value;

			if (xLowerCaseName === aLowerCaseName) return xLowerCaseName > yLowerCaseName;
			return yLowerCaseName > xLowerCaseName;
		}

		const diff = [];
		for (let i = 0; i < Math.min(aNames.length, bNames.length); i++) {
			diff.push(Math.abs(aNames[i]!.length - bNames[i]!.length));
		}
		return aNames[diff.lastIndexOf(Math.min(...diff))]! > bNames[diff.lastIndexOf(Math.min(...diff))]!;
	}
});
