import type { ExternalRuntimeMessageHandler, RuntimeMessageHandler } from './runtimeMessages';

export type StartupHandler = () => void;
export type TSTRegisteredHandler = () => void;

export interface BackgroundFragment {
	startupHandler?: StartupHandler;
	tstRegisteredHandler?: TSTRegisteredHandler;
	runtimeMessageHandler?: RuntimeMessageHandler;
	externalRuntimeMessageHandler?: ExternalRuntimeMessageHandler;
}
