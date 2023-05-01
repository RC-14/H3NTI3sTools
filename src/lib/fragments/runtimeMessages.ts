import z from 'zod';
import { Runtime } from 'webextension-polyfill';
import { JSONValueSchema } from '/src/lib/json';

export const RuntimeMessageSchema = z.object({
	target: z.enum(['content', 'popup', 'sidebar', 'page', 'devtools', 'options', 'background']),
	fragmentId: z.string().min(1),
	msg: z.string().nullable(),
	data: JSONValueSchema.optional()
});

export type RuntimeMessage = z.infer<typeof RuntimeMessageSchema>;

export type RuntimeMessageHandler = (msg: RuntimeMessage['msg'], data: RuntimeMessage['data'], sender: Runtime.MessageSender) => void | RuntimeMessage['data'] | Promise<void | RuntimeMessage['data']>;
