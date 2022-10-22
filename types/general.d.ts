type jsonObject = {
	[key: string]: boolean | number | string | jsonObject | jsonArray | null;
};

type jsonArray = (boolean | number | string | jsonObject | jsonArray | null)[];
