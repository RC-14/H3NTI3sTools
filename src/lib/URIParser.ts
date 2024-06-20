// Pure TypeScript Implementation, without regex, of RFC3986 URIs (https://datatracker.ietf.org/doc/html/rfc3986)

const DECIMAL_DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

// https://datatracker.ietf.org/doc/html/rfc3986#section-3.2.1
class URIUserInformation {
	protected static readonly PASSWORD_PREFIX = ':';

	protected static readonly INVALID_USER_NAME_ERROR = new Error("Invalid URI User Info User Name.");
	protected static readonly INVALID_PASSWORD_ERROR = new Error("Invalid URI User Info Password.");

	// TODO: Write validateUserName()
	static validateUserName(string: string): boolean {
	}

	// TODO: Write validatePassword()
	static validatePassword(string: string): boolean {
	}

	constructor(userInfoString: string) {
		const passwordPrefixIndex = userInfoString.indexOf(URIUserInformation.PASSWORD_PREFIX, 1);

		if (passwordPrefixIndex === -1) {
			this.#userName = userInfoString;
			if (!URIUserInformation.validateUserName(this.#userName)) throw URIUserInformation.INVALID_USER_NAME_ERROR;
			return;
		}

		this.#userName = userInfoString.substring(0, passwordPrefixIndex);
		if (!URIUserInformation.validateUserName(this.#userName)) throw URIUserInformation.INVALID_USER_NAME_ERROR;

		this.#password = userInfoString.substring(passwordPrefixIndex + 1);
		if (!URIUserInformation.validatePassword(this.#password)) throw URIUserInformation.INVALID_PASSWORD_ERROR;
	}

	#userName: string;
	#password?: string | undefined;

	get userName() {
		return this.#userName;
	}

	get password() {
		return this.#password;
	}

	set userName(userName) {
		if (!URIUserInformation.validateUserName(userName)) throw URIUserInformation.INVALID_USER_NAME_ERROR;
		this.#userName = userName;
	}

	set password(password) {
		if (!(password === undefined || URIUserInformation.validatePassword(password))) throw URIUserInformation.INVALID_PASSWORD_ERROR;
		this.#password = password;
	}

	toString(): string {
		if (this.#password === undefined) return this.#userName;
		return `${this.#userName}:${this.#password}`;
	}
}

// https://datatracker.ietf.org/doc/html/rfc3986#section-3.2
class URIAuthority {
	protected static readonly USER_INFO_SUFFIX = '@';
	protected static readonly PORT_PREFIX = ':';

	protected static readonly INVALID_HOST_ERROR = new Error("Invalid URI Authority Host.");
	protected static readonly INVALID_PORT_ERROR = new Error("Invalid URI Authority Port.");

	// TODO: Write validateHost()
	static validateHost(string: string): boolean {
		// IPv6 ([1234:1234:1234:1234:1234:1234:1234:1234])
		if (string.startsWith('[')) {
			if (!string.endsWith(']')) return false;
			return true;
		}

		const parts = string.split('.');

		// IPv4 (123.123.123.123)
		if (string.length < 16 && string.length > 6 && parts.length === 4) {
			let lengthCounter = 0;
			let valid = true;

			for (let i = 0; i < string.length; i++) {
				if (string[i] === '.') {
					lengthCounter = 0;
					continue;
				}

				if (!DECIMAL_DIGITS.includes(string[i]!)) {
					valid = false;
					break;
				}

				if (lengthCounter === 3) {
					valid = false;
					break;
				}
				lengthCounter++;
			}

			if (valid) return true;
		}

		// Domain Name (abc.abc)
		return true;
	}

	static validatePort(string: string): boolean {
		if (string.length === 0) return false;

		for (let i = 0; i < string.length; i++) {
			if (isNaN(parseInt(string[i]!, 10))) return false;
		}

		return true;
	}

	constructor(authorityString: string) {
		const userInfoSuffixIndex = authorityString.indexOf(URIAuthority.USER_INFO_SUFFIX, 1);

		if (userInfoSuffixIndex !== -1) {
			this.#userInfo = new URIUserInformation(authorityString.substring(0, userInfoSuffixIndex));
		}

		const portPrefixIndex = authorityString.indexOf(URIAuthority.PORT_PREFIX, userInfoSuffixIndex + 1);

		if (portPrefixIndex === -1) {
			this.#host = authorityString.substring(userInfoSuffixIndex + 1);
			if (!URIAuthority.validateHost(this.#host)) throw URIAuthority.INVALID_HOST_ERROR;
			return;
		}

		this.#host = authorityString.substring(userInfoSuffixIndex + 1, portPrefixIndex);
		if (!URIAuthority.validateHost(this.#host)) throw URIAuthority.INVALID_HOST_ERROR;

		this.#port = authorityString.substring(portPrefixIndex + 1);
		if (!URIAuthority.validatePort(this.#port)) throw URIAuthority.INVALID_PORT_ERROR;
	}

	#userInfo?: URIUserInformation;
	#host: string; // https://datatracker.ietf.org/doc/html/rfc3986#section-3.2.2
	#port?: string | undefined; // https://datatracker.ietf.org/doc/html/rfc3986#section-3.2.3

	get userInfo() {
		return this.#userInfo;
	}

	get host() {
		return this.#host;
	}

	get port() {
		return this.#port;
	}

	set host(host) {
		if (!URIAuthority.validateHost(host)) throw URIAuthority.INVALID_HOST_ERROR;
		this.#host = host;
	}

	set port(port) {
		if (!(port === undefined || URIAuthority.validatePort(port))) throw URIAuthority.INVALID_PORT_ERROR;
		this.#port = port;
	}

	toString() {
		if (this.#userInfo === undefined && this.#port === undefined) return this.#host;
		if (this.#port === undefined) return `${this.#userInfo}${URIAuthority.USER_INFO_SUFFIX}${this.#host}`;
		if (this.#userInfo === undefined) return `${this.#host}${URIAuthority.PORT_PREFIX}${this.#port}`;
		return `${this.#userInfo}${URIAuthority.USER_INFO_SUFFIX}${this.#host}${URIAuthority.PORT_PREFIX}${this.#port}`;
	}
}

// https://datatracker.ietf.org/doc/html/rfc3986#section-3.4
class URIQuery {
	// TODO: Write Errors
	// TODO: Write validators

	constructor(queryString: string) {
		// TODO: Write constructor logic
	}

	// TODO: Write variables

	// TODO: Write getters
	// TODO: Write setters

	toString() {
		// TODO: Write toString logic
		return '';
	}
}

// https://datatracker.ietf.org/doc/html/rfc3986#section-4.2
class RelativeReference {
}

// https://datatracker.ietf.org/doc/html/rfc3986#section-4.1
class URIReference {
}

// https://datatracker.ietf.org/doc/html/rfc3986#section-4.3
class AbsoluteURI {
}

class URI {
	protected static readonly SCHEME_SUFFIX = ':';
	protected static readonly AUTHORITY_PREFIX = '//';
	protected static readonly QUERY_PREFIX = '?';
	protected static readonly FRAGMENT_PREFIX = '#';

	// TODO: Write Errors
	// TODO: Write validators

	constructor(uriString: string) {
		// TODO: Write constructor logic
	}

	#scheme: string; // https://datatracker.ietf.org/doc/html/rfc3986#section-3.1
	#authority?: URIAuthority;
	#path: string; // https://datatracker.ietf.org/doc/html/rfc3986#section-3.3
	#query?: URIQuery;
	#fragment?: string | undefined; // https://datatracker.ietf.org/doc/html/rfc3986#section-3.5

	get scheme() {
		return this.#scheme;
	}

	get authority() {
		return this.#authority;
	}

	get path() {
		return this.#path;
	}

	get query() {
		return this.#query;
	}

	get fragment() {
		return this.#fragment;
	}

	set scheme(scheme) {
	}

	set path(path) {
	}

	set fragment(fragment) {
	}

	toString() {
		let string = '';

		string += `${this.#scheme}${URI.SCHEME_SUFFIX}`;
		if (this.#authority !== undefined) string += `${URI.AUTHORITY_PREFIX}${this.#authority}`;
		string += this.#path;
		if (this.#query !== undefined) string += `${URI.QUERY_PREFIX}${this.#query}`;
		if (this.#fragment !== undefined) string += `${URI.FRAGMENT_PREFIX}${this.#fragment}`;

		return string;
	}
}
