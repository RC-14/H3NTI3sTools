import { Media, MediaTypeHandler } from '/src/lib/viewer';

const VIDEO_SKIP_DURATION = 5;
let video: HTMLVideoElement | undefined = undefined;

let autoProgressPromiseReject: (() => void) | undefined = undefined;
let autoProgressPromiseResolve: (() => void) | undefined = undefined;

const hasFullscreen = () => document.fullscreenElement !== null;

const getVideoElementFromContentContainer = (contentContainer: HTMLDivElement) => {
	const video = contentContainer.firstElementChild;
	if (!(video instanceof HTMLVideoElement)) throw new Error("The content containers first child isn't a video.");
	return video;
};

const togglePlayPause = () => {
	if (video === undefined) throw new Error(`Can't play/pause: video is undefined`);

	if (video.paused) {
		video.play();
	} else {
		video.pause();
	}
};

const skip = () => {
	if (video === undefined) throw new Error(`Can't skip: video is undefined`);

	let newTime = video.currentTime + VIDEO_SKIP_DURATION;
	if (!isNaN(video.duration) && !isFinite(video.duration)) {
		if (newTime > video.duration) newTime = video.duration;
	}
	video.currentTime = newTime;
};

const rewind = () => {
	if (video === undefined) throw new Error(`Can't rewind: video is undefined`);

	let newTime = video.currentTime - VIDEO_SKIP_DURATION;
	if (newTime < 0) newTime = 0;
	video.currentTime = newTime;
};

const toggleMute = () => {
	if (video === undefined) throw new Error(`Can't toggle mute: video is undefined`);

	video.muted = !video.muted;
};

const toggleLoop = () => {
	if (video === undefined) throw new Error(`Can't toggle loop: video is undefined`);

	video.loop = !video.loop;
};

const toggleFullscreen = () => {
	if (video === undefined) throw new Error(`can't toggle fullscreen: video is undefined`);

	if (hasFullscreen()) {
		document.exitFullscreen();
		return;
	}
	video.requestFullscreen();
};

const videoPauseListener = () => {
	if (autoProgressPromiseResolve === undefined) return;

	autoProgressPromiseResolve();
	autoProgressPromiseReject = autoProgressPromiseResolve = undefined;
};

// Keybinds
const keybindHandlers = {
	togglePlayPause: (media: Media, contentContainer: HTMLDivElement, event: KeyboardEvent) => {
		event.preventDefault();
		togglePlayPause();
		return false;
	},
	rewind: (media: Media, contentContainer: HTMLDivElement, event: KeyboardEvent) => {
		if (video === undefined) throw new Error(`Video was undefined when the rewind keybind got activated.`);

		event.preventDefault();
		if (video.currentTime === 0) return true;
		rewind();
		return false;
	},
	skip: (media: Media, contentContainer: HTMLDivElement, event: KeyboardEvent) => {
		if (video === undefined) throw new Error(`Video was undefined when the skip keybind got activated.`);

		event.preventDefault();
		if (video.currentTime === video.duration) return true;
		skip();
		return false;
	},
	toggleMute: (media: Media, contentContainer: HTMLDivElement, event: KeyboardEvent) => {
		event.preventDefault();
		toggleMute();
		return false;
	},
	toggleLoop: (media: Media, contentContainer: HTMLDivElement, event: KeyboardEvent) => {
		event.preventDefault();
		toggleLoop();
		return false;
	},
	toggleFullscreen: (media: Media, contentContainer: HTMLDivElement, event: KeyboardEvent) => {
		event.preventDefault();
		toggleFullscreen();
		return false;
	}
};

const defaultExport: MediaTypeHandler = {
	addContentToContentContainer: async (media, contentContainer, getSrcForSource) => {
		// TODO: Have a smart idea on how to manage multiple videos
		const src = await getSrcForSource(media.sources[0]);

		const video = document.createElement('video');
		video.src = src;
		contentContainer.append(video);
	},
	preload: (media, contentContainer, direction) => undefined,
	presentMedia: (media, contentContainer, direction, addKeybind, setProgressFunc, progress) => {
		video = getVideoElementFromContentContainer(contentContainer);

		addKeybind('Space', keybindHandlers.togglePlayPause);
		addKeybind('ArrowLeft', keybindHandlers.rewind);
		addKeybind('ArrowRight', keybindHandlers.skip);
		addKeybind('KeyM', keybindHandlers.toggleMute);
		addKeybind('KeyL', keybindHandlers.toggleLoop);
		addKeybind('KeyF', keybindHandlers.toggleFullscreen);

		video.currentTime = 0;
		video.addEventListener('pause', videoPauseListener, { passive: true });

		video.play();
	},
	hideMedia: (media, contentContainer, direction, removeKeybind) => {
		if (video === undefined) throw new Error(`Video was undefined when hideMedia was called.`);

		if (autoProgressPromiseReject !== undefined) {
			autoProgressPromiseReject();
			autoProgressPromiseReject = autoProgressPromiseResolve = undefined;
		}

		removeKeybind('Space', keybindHandlers.togglePlayPause);
		removeKeybind('ArrowLeft', keybindHandlers.rewind);
		removeKeybind('ArrowRight', keybindHandlers.skip);
		removeKeybind('KeyM', keybindHandlers.toggleMute);
		removeKeybind('KeyL', keybindHandlers.toggleLoop);
		removeKeybind('KeyF', keybindHandlers.toggleFullscreen);

		video.removeEventListener('pause', videoPauseListener);

		video.pause();

		video.muted = false;
		video.loop = false;
		document.exitFullscreen();

		video = undefined;
	},
	autoProgressHandler: (media, contentContainer, direction) => {
		const video = contentContainer.firstElementChild;
		if (!(video instanceof HTMLVideoElement)) throw new Error("The content containers first child isn't a video.");

		if (video.paused) return true;

		const autoProgressPromise = new Promise<void>((resolve, reject) => {
			autoProgressPromiseReject = reject;
			autoProgressPromiseResolve = resolve;
		});
		return autoProgressPromise;
	},
};

export default defaultExport;
