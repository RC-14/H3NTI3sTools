declare namespace Nhentai {
	type ReaderSettings = {
		version: 2;
		preload: 0 | 1 | 2 | 3 | 4 | 5;
		turning_behavior: 'left' | 'right' | 'both';
		image_scaling: 'fit-horizontal' | 'fit-both';
		jump_on_turn: 'image' | 'controls' | 'none';
		scroll_speed: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20;
		zoom: number; // untested - changing this with the settings on nhentai seems to be broken right now (default: 100)
	}
}
