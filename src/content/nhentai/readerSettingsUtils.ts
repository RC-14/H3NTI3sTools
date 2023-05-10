import { z } from 'zod';

export const ReaderSettingsSchema = z.object({
	version: z.number().int().nonnegative(),
	preload: z.number().int().nonnegative().max(5),
	turning_behavior: z.enum(['left', 'right', 'both']),
	image_scaling: z.enum(['fit-horizontal', 'fit-both']),
	jump_on_turn: z.enum(['image', 'controls', 'none']),
	scroll_speed: z.number().int().positive().max(20),
	zoom: z.number().multipleOf(20).min(100).max(300) // untested - changing this with the settings on nhentai seems to be broken right now (default: 100)
});

export type ReaderSettings = z.infer<typeof ReaderSettingsSchema>;

const READER_SETTINGS_STORAGE_KEY = 'reader';
const CUSTOM_READER_SETTINGS: ReaderSettings = {
	version: 2,
	preload: 5,
	turning_behavior: 'right',
	image_scaling: 'fit-both',
	jump_on_turn: 'image',
	scroll_speed: 5,
	zoom: 100
};
const READER_SETTING_VERSION: ReaderSettings['version'] = CUSTOM_READER_SETTINGS.version;

/**
 * Returns the current reader settings read from local storage.
 * 
 * @returns The current reader settings as an object or null if they're not set.
 */
export const getReaderSettings = (): ReaderSettings | null => {
	const uncheckedReaderSettings = JSON.parse(localStorage.getItem(READER_SETTINGS_STORAGE_KEY) ?? 'null');
	if (uncheckedReaderSettings === null) return null;

	const validationResult = ReaderSettingsSchema.safeParse(uncheckedReaderSettings);
	if (!validationResult.success) return null;

	const readerSettings = validationResult.data;
	if (READER_SETTING_VERSION !== readerSettings.version) throw new Error(`New version (${readerSettings.version}) for nhentai reader settings.`);

	return readerSettings;
};

/**
 * Sets the reader settings in local storage to the ones provided.
 * 
 * @param settings The settings to set - must always contain valid values for all settings.
 */
export const setReaderSettings = (settings: ReaderSettings) => {
	const jsonSettings = JSON.stringify(ReaderSettingsSchema.parse(settings));
	localStorage.setItem(READER_SETTINGS_STORAGE_KEY, jsonSettings);
};

/**
 * Applies custom reader settings via `setReaderSettings()`.
 */
export const applyCustomReaderSettings = () => {
	const readerSettings = getReaderSettings();

	if (readerSettings !== null) {
		let alreadySet = true;

		for (const key of Object.keys(readerSettings) as (keyof typeof readerSettings)[]) {
			if (readerSettings[key] === CUSTOM_READER_SETTINGS[key]) continue;

			alreadySet = false;
			break;
		}

		if (alreadySet) return;
	}

	setReaderSettings(CUSTOM_READER_SETTINGS);
	location.reload();
};
