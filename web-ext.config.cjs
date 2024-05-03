// TODO: Manage creation and deletion of temporary profile here to avoid copying indexedDB

module.exports = {
	sourceDir: 'build',
	artifactsDir: 'dist',
	run: {
		target: ['firefox-desktop'],
		// startUrl: ['about:addons','about:debugging#/runtime/this-firefox'],
		firefox: 'firefoxdeveloperedition',
		firefoxProfile: 'dev-edition',
		keepProfileChanges: false,
		preInstall: true
	},
	build: {
		// {path.to.value} will be replaced with whatever value is there in the manifest
		filename: '{short_name}_v{version}.zip',
		overwriteDest: true
	}
};
