import { MediaTypeHandler } from '/src/lib/viewer';

const VIDEO_SKIP_DURATION = 5;

const hasFullscreen = () => document.fullscreenElement !== null;

const togglePlayPause = (video: HTMLVideoElement) => {
	if (video.paused) {
		video.play();
	} else {
		video.pause();
	}
};

const skip = (video: HTMLVideoElement) => {
	let newTime = video.currentTime + VIDEO_SKIP_DURATION;
	if (!isNaN(video.duration) && !isFinite(video.duration)) {
		if (newTime > video.duration) newTime = video.duration;
	}
	video.currentTime = newTime;
};

const rewind = (video: HTMLVideoElement) => {
	let newTime = video.currentTime - VIDEO_SKIP_DURATION;
	if (newTime < 0) newTime = 0;
	video.currentTime = newTime;
};

const toggleMute = (video: HTMLVideoElement) => {
	video.muted = !video.muted;
};

const toggleLoop = (video: HTMLVideoElement) => {
	video.loop = !video.loop;
};

const toggleFullscreen = (video: HTMLVideoElement) => {
	if (hasFullscreen()) {
		document.exitFullscreen();
		return;
	}
	video.requestFullscreen();
};

const defaultExport: MediaTypeHandler = {
	addContentToContentContainer: async (media, contentContainer, getSrcForSource) => {
		const src = await getSrcForSource(media.sources[0]);

		const video = document.createElement('video');
		video.src = src;
		contentContainer.append(video);
	},
	preload: (media, contentContainer, direction) => undefined,
	presentMedia: (media, contentContainer, direction) => {
		const video = contentContainer.firstElementChild;
		if (!(video instanceof HTMLVideoElement)) throw new Error("The content containers first child isn't a video.");

		video.currentTime = 0;

		video.play();
	},
	hideMedia: (media, contentContainer, direction) => {
		const video = contentContainer.firstElementChild;
		if (!(video instanceof HTMLVideoElement)) throw new Error("The content containers first child isn't a video.");

		video.pause();

		video.muted = false;
		video.loop = false;
		document.exitFullscreen();
	},
	presentationControlHandler: (media, contentContainer, event) => {
		const video = contentContainer.firstElementChild;
		if (!(video instanceof HTMLVideoElement)) throw new Error("The content containers first child isn't a video.");

		event.preventDefault();

		switch (event.code) {
			case 'Space':
				togglePlayPause(video);
				return false;

			case 'ArrowLeft':
				if (video.currentTime === 0) return true;
				rewind(video);
				return false;

			case 'ArrowRight':
				if (video.currentTime === video.duration) return true;
				skip(video);
				return false;

			case 'KeyM':
				toggleMute(video);
				return false;

			case 'KeyL':
				toggleLoop(video);
				return false;

			case 'KeyF':
				toggleFullscreen(video);
				return false;
		}

		return !hasFullscreen();
	}
};

export default defaultExport;
