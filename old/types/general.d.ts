type jsonValue = boolean | number | string | jsonObject | jsonArray | null;

type jsonObject = {
	[key: string]: jsonValue;
};

type jsonArray = jsonValue[];
