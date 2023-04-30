import { z } from 'zod';

export type JSONValue = boolean | number | string | JSONArray | JSONObject | null;
export type JSONArray = JSONValue[];
export type JSONObject = { [key: string]: JSONValue; };

export const JSONValueSchema: z.ZodType<JSONValue> = z.lazy(() => z.union([z.boolean(), z.number(), z.string(), z.array(JSONValueSchema), z.record(JSONValueSchema), z.null()]));
export const JSONArraySchema: z.ZodType<JSONArray> = z.array(JSONValueSchema);
export const JSONObjectSchema: z.ZodType<JSONObject> = z.record(JSONValueSchema);
