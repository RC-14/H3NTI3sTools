import { BackgroundFragment } from '/src/lib/fragments';

// @ts-ignore Necessary because typescript doesn't know that parcel does glob imports
import * as __unsafe_fragments__ from './*/fragment.ts';

const fragments: Map<string, BackgroundFragment> = new Map(
	Object.entries(__unsafe_fragments__ as { [key: string]: BackgroundFragment; })
);

/*
 * Register Handlers
 */

for (const id of fragments.keys()) {
	const fragment = fragments.get(id);
}
