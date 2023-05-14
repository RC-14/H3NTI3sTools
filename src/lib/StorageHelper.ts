import { Storage, storage } from 'webextension-polyfill';

type StorageAreaName = Exclude<keyof typeof storage, 'onChanged'>;

/**
 * A wrapper for `Storage` which splits the storage areas into namespaces.
 */
export default class StorageHelper {
	constructor(areaName: StorageAreaName, namespace: string | null) {
		this.#storage = storage[areaName];
		this.#namespace = namespace;

		this.#storageInit = this.#storage.get(this.#namespace).then((data) => {
			if (this.#namespace !== null) {
				data = data[this.#namespace];
			}
			if (typeof data !== 'object') {
				data = {};
				this.#pushData();
			}
			this.#data = data;
		});
		this.#storage.onChanged.addListener(this.#onChangeListener.bind(this));
	}

	#storageInit: Promise<void>;
	#storage: Storage.StorageArea;
	#namespace: string | null;
	#data: { [key: string]: unknown; } = {};
	#listeners: ((changes: { [key: string]: Storage.StorageChange; }) => unknown)[] = [];

	/**
	 * Creates a safe deep copy of the input.
	 * 
	 * Symbols and functions result in nothing aka. undefined.
	 * 
	 * @param input Any data you want a copy of.
	 * 
	 * @returns The copy of input.
	 */
	#safeCopy(input: unknown): unknown {
		if (['function', 'symbol'].includes(typeof input)) return undefined;
		return structuredClone(input);
	}

	/**
	 * Push the local copy of the store contents to the `Storage` API.
	 */
	async #pushData() {
		await this.#storageInit;

		let data: { [key: string]: unknown; } = {};

		if (this.#namespace === null) {
			data = this.#data;
		} else {
			data[this.#namespace] = this.#data;
		}

		await this.#storage.set(data);
	}

	/**
	 * The listener for changes to the storage contents.
	 * 
	 * Updates the local copy of the storage contents and calls the user defined listeners.
	 * 
	 * @param changes An object representing the changes to the storage contents.
	 */
	async #onChangeListener(changes: { [key: string]: Storage.StorageChange; }) {
		const namespaces = Object.keys(changes);
		if (this.#namespace !== null && !namespaces.includes(this.#namespace)) return;

		await this.#storageInit;

		if (this.#namespace === null) {
			for (const namespace of namespaces) {
				const currentChanges = changes[namespace];

				if (currentChanges.newValue !== undefined) {
					this.#data[namespace] = currentChanges.newValue;
					continue;
				}
				delete this.#data[namespace];
			}
		} else {
			const namespaceChanges = changes[this.#namespace];
			const tmp: { [key: string]: Storage.StorageChange; } = {};
			let oldKeys: string[] = [];
			let newKeys: string[] = [];

			if (namespaceChanges.newValue === undefined) {
				this.#data = {};

				oldKeys = Object.keys(namespaceChanges.oldValue);
			} else {
				this.#data = namespaceChanges.newValue;

				if (namespaceChanges.oldValue !== undefined) oldKeys = Object.keys(namespaceChanges.oldValue);
				newKeys = Object.keys(namespaceChanges.newValue);
			}

			for (const key of oldKeys) {
				tmp[key] = { oldValue: namespaceChanges.oldValue[key] };
			}

			for (const key of newKeys) {
				if (tmp[key] === undefined) tmp[key] = {};
				tmp[key].newValue = namespaceChanges.newValue[key];
			}

			changes = tmp;
		}

		for (const listener of this.#listeners) {
			listener(this.#safeCopy(changes) as { [key: string]: Storage.StorageChange; });
		}
	}

	/**
	 * Check if a function is already registered as a listener.
	 * 
	 * @param listener The function to check for.
	 * 
	 * @returns `true` if the function is already registered as a listener and `false` otherwise.
	 */
	isListenerRegistered(listener: (changes: { [key: string]: Storage.StorageChange; }) => unknown) {
		return this.#listeners.includes(listener);
	}

	/**
	 * Check if any listeners are registered.
	 * 
	 * @returns `true` if there is at least 1 listener registered.
	 */
	hasChangeListeners() {
		return this.#listeners.length > 0;
	}

	/**
	 * Register a function as a listener for changes to the storage contents.
	 * 
	 * The argument passed to the listener is an object with keys for each changed record and a corresponding value with a StorageChange object.
	 * 
	 * @param listener A function taking one argument (the object representing the changes).
	 */
	registerChangeListener(listener: (changes: { [key: string]: Storage.StorageChange; }) => unknown) {
		this.#listeners.push(listener);
	}

	/**
	 * Remove a function from the listeners.
	 * 
	 * Removes all occurrences at once.
	 * 
	 * @param listener The function which should no langer be a listener.
	 */
	removeChangeListener(listener: (changes: { [key: string]: Storage.StorageChange; }) => unknown) {
		for (let i = this.#listeners.length - 1; i >= 0; i--) {
			if (this.#listeners[i] === listener) this.#listeners.splice(i, 1);
		}
	}

	/**
	 * Used to read data from storage.
	 * 
	 * Omitting the argument or passing undefined will return the complete contents of the storage.
	 * 
	 * @param key The key which to read data from.
	 * 
	 * @returns A Promise resolving to the requested data.
	 */
	async get(key?: string) {
		await this.#storageInit;

		if (key == null) return this.#safeCopy(this.#data) as { [key: string]: unknown; };

		return this.#safeCopy(this.#data[key]);
	}

	/**
	 * Set the value for the given key.
	 * 
	 * @param key The key to which the value will be written.
	 * 
	 * @param value The value to write.
	 */
	async set(key: string, value: unknown): Promise<void>;
	/**
	 * Set the values for all keys on the object.
	 * 
	 * Overwrites only the given keys not the complete storage.
	 * 
	 * @param items An object containing the keys to overwrite and the respective values.
	 */
	async set(items: { [key: string]: unknown; }): Promise<void>;
	async set(arg1: string | { [key: string]: unknown; }, arg2?: unknown) {
		await this.#storageInit;

		if (typeof arg1 === 'string') {
			const obj: { [key: string]: unknown; } = {};
			obj[arg1] = arg2;
			arg1 = obj;
		}

		arg1 = this.#safeCopy(arg1) as { [key: string]: unknown; };
		const keys = Object.keys(arg1);

		for (const key of keys) {
			this.#data[key] = arg1[key];
		}

		await this.#pushData();
	}

	/**
	 * Removes the given key (and data for that key) from storage.
	 * 
	 * If passed an array will remove the data for all keys in the array.
	 * 
	 * Like `delete object[key]`.
	 * 
	 * @param keys The key or an array of keys which to delete from storage.
	 */
	async remove(keys: string | string[]) {
		await this.#storageInit;

		if (typeof keys === 'string') {
			delete this.#data[keys];
		} else {
			for (const key of keys) {
				delete this.#data[key];
			}
		}

		await this.#pushData();
	}

	/**
	 * Removes all data from storage.
	 */
	async clear() {
		if (typeof this.#namespace !== 'string') {
			await this.#storage.clear();
		} else {
			await this.#storage.remove(this.#namespace);
		}
		this.#data = {};
	}
}
