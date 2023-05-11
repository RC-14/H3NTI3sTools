module.exports = {
	sourceDir: 'build',
	artifactsDir: 'dist',
	run: {
		target: ['firefox-desktop'],
		startUrl: ['about:debugging#/runtime/this-firefox'],
		firefox: 'firefoxdeveloperedition',
		firefoxProfile: 'dev-edition-default',
		keepProfileChanges: false,
		preInstall: true
	},
	build: {
		// {path.to.value} will be replaced with whatever value is there in the manifest
		filename: '{short_name}_v{version}.zip',
		overwriteDest: true
	}
};