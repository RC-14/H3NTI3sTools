type JSONValue = boolean | number | string | JSONArray | JSONObject | null;
type JSONArray = JSONValue[];
type JSONObject = { [key: string]: JSONValue; };
