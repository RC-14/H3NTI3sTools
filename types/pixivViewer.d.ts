namespace PixivViewer {
	export interface Illustration {
		id: number;
		pageCount?: number;
	}

	export interface Image {
		id: Illustration['id'];
		page?: number;
		overwriteUrl?: string;
	}

	export interface APIResponse {
		error: boolean;
		message: string;
		body: jsonObject;
	}
}