export default class StorageHelper {
	constructor(areaName: chrome.storage.AreaName, namespace: string | null) {
		this.#storage = chrome.storage[areaName];
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
	#storage: chrome.storage.StorageArea;
	#namespace: string | null;
	#data: { [key: string]: unknown; } = {};
	#listeners: ((changes: { [key: string]: chrome.storage.StorageChange; }) => unknown)[] = [];

	#safeCopy(input: unknown): unknown {
		if (input == null) return input;
		if (typeof input === 'function') return undefined;
		if (typeof input !== 'object') return input;
		return JSON.parse(JSON.stringify(input));
	}

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

	async #onChangeListener(changes: { [key: string]: chrome.storage.StorageChange; }) {
		const namespaces = Object.keys(changes);
		if (this.#namespace !== null && !namespaces.includes(this.#namespace)) return;

		await this.#storageInit;

		if (this.#namespace === null) {
			for (let i = 0; i < namespaces.length; i++) {
				const currentChanges = changes[namespaces[i]];

				if (currentChanges.newValue !== undefined) {
					this.#data[namespaces[i]] = currentChanges.newValue;
					return;
				}
				delete this.#data[namespaces[i]];
			}
		} else {
			const namespaceChanges = changes[this.#namespace];
			const tmp: { [key: string]: chrome.storage.StorageChange; } = {};
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

			for (let i = 0; i < oldKeys.length; i++)
				tmp[oldKeys[i]] = { oldValue: namespaceChanges.oldValue[oldKeys[i]] };

			for (let i = 0; i < newKeys.length; i++) {
				if (tmp[newKeys[i]] === undefined) tmp[newKeys[i]] = {};
				tmp[newKeys[i]].newValue = namespaceChanges.newValue[newKeys[i]];
			}

			changes = tmp;
		}

		for (let i = 0; i < this.#listeners.length; i++)
			this.#listeners[i](this.#safeCopy(changes) as { [key: string]: chrome.storage.StorageChange; });
	}

	hasChangeListener(listener: (changes: { [key: string]: chrome.storage.StorageChange; }) => unknown) {
		return this.#listeners.includes(listener);
	}

	hasChangeListeners() {
		return this.#listeners.length > 0;
	}

	addChangeListener(listener: (changes: { [key: string]: chrome.storage.StorageChange; }) => unknown) {
		this.#listeners.push(listener);
	}

	removeChangeListener(listener: (changes: { [key: string]: chrome.storage.StorageChange; }) => unknown) {
		for (let i = this.#listeners.length - 1; i >= 0; i--)
			if (this.#listeners[i] === listener) this.#listeners.splice(i, 1);
	}

	async get(key?: string) {
		await this.#storageInit;

		if (key == null) return this.#safeCopy(this.#data) as { [key: string]: unknown; };

		return this.#safeCopy(this.#data[key]);
	}

	async set(key: string, value: unknown): Promise<void>;
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

		for (let i = 0; i < keys.length; i++)
			this.#data[keys[i]] = arg1[keys[i]];

		await this.#pushData();
	}

	async remove(keys: string | string[]) {
		await this.#storageInit;

		if (typeof keys === 'string') {
			delete this.#data[keys];
		} else {
			for (let i = 0; i < keys.length; i++)
				delete this.#data[keys[i]];
		}

		await this.#pushData();
	}

	async clear() {
		if (typeof this.#namespace !== 'string') {
			await this.#storage.clear();
		} else {
			await this.#storage.remove(this.#namespace);
		}
		this.#data = {};
	}
}
