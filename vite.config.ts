import { defineConfig } from "vite";
import webExtension from "vite-plugin-web-extension";

export default defineConfig({
	mode: 'development',
	build: {
		target: 'esnext',
		outDir: 'build',
		sourcemap: 'inline'
	},
	plugins: [
		webExtension({
			additionalInputs: [
			],
			browser: 'firefox',
			webExtConfig: {
				target: ['firefox-desktop'],
				startUrl: ['about:debugging#/runtime/this-firefox'],
				firefox: 'firefoxdeveloperedition',
				firefoxProfile: 'dev-edition-default',
				keepProfileChanges: false
			}
		})
	],
});
