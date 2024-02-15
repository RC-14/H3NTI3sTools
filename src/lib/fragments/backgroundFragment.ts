import type { ExternalRuntimeMessageHandler, RuntimeMessageHandler } from './runtimeMessages';

export type StartupHandler = () => void;

export interface BackgroundFragment {
	startupHandler?: StartupHandler;
	runtimeMessageHandler?: RuntimeMessageHandler;
	externalRuntimeMessageHandler?: ExternalRuntimeMessageHandler;
}
