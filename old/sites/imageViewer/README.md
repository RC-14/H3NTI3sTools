# imageViewer Concept

## Sources

This has to account for more than just URLs, for example images from zip files downloaded from a website.

It also has to be a string and it must be easily parsable and readable/writable by a human.

>type data

Note that `type` and `data` are separated by a space, this is because a source is a space separated list.
`data` is not necessarily only one entry in that list, a source could also be something like this:
>type data1 data2

Inside the individual `data` entries spaces must be encoded as their URI encoding and because that starts with a percent sign (`%20`) percent signs must also be encoded as their URI encoding (`%25`).

Encoding is not necessary for `type` as everything besides upper and lowercase letters and numbers is not allowed (`/a-zA-Z0-9/`).

### Examples:

- `url urlToImage`
	- `url https://example.com/image.png`
- `zip zipUrlSource pathToImage`
	- `zip https://example.com/zippedImages.zip /path/to/image.png`
	- `zip https://example.com/zippedImages.zip /path/with%20space/to/image.png`
- `pixiv illustId page`
	- `pixiv 106472754 2`

## Database

```TS
type uuid = string // crypto.randomUUID()
type base64Data = string // btoa(unknown)
type source = string
type date = number // Date.now()
type nnlString = string // no new line string

type indexedDB = {
	images: {
		'key path': 'source'
		indexes: {}
		data: {
			source: source
			image: base64Data // base64 encoded image
		}
	}
	galleries: {
		'key path': 'uuid'
		indexes: {
			name: { unique: false }
			favorite: { unique: false }
			sources: { unique: false, multiEntry: true }
			tags: { unique: false, multiEntry: true }
			authorUuid: { unique: false }
		}
		data: {
			uuid: uuid
			name: nnlString
			info: string
			favorite: boolean
			sources: source[]
			type: Gallery['type']
			tags: nnlString[]
			authorUuid: uuid
			creationDate: date
			lastViewed: date
		}
	}
	authors: {
		'key path': 'uuid'
		indexes: {
			name: { unique: false }
			avatar: { unique: false }
		}
		data: {
			uuid: uuid
			name: nnlString
			info: string
			avatar: source
		}
	}
}
```

## Background

### Constructing the Reader URL

```TS
const url = new URL(chrome.runtime.getURL('path/to/index.html'))
url.search = JSON.stringify(galleries.map(gallery => gallery.uuid))
```

## Reader

### Getting the Galleries

```TS
const galleryUUIDs: Gallery['uuid'][] = JSON.parse(decodeURIComponent(location.search.substring(1)))

const galleries: Gallery[]

for (const galleryUuid of galleryUUIDs) {
	const gallery = getGalleryForUUID(galleryUuid)

	if (!isGallery(gallery)) continue;

	galleries.push(gallery)
}
```
