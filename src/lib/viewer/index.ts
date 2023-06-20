import mediaTypeHandlersImport from './mediaTypeHandlers';
import { MediaTypeHandler } from './types';

export * from './types';
export * from './idbUtils';
export const mediaTypeHandlers: { [key: string]: MediaTypeHandler; } = mediaTypeHandlersImport;

export const MEDIA_ORIGINS_SEARCH_PARAM = 'm';
export const CURRENT_MEDIA_SEARCH_PARAM = 'c';
export const PROGRESS_SEARCH_PARAM = 'p';
