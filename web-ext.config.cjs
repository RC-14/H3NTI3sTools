module.exports = {
	sourceDir: 'build',
	artifactsDir: 'dist',
	build: {
		// {path.to.value} will be replaced with whatever value is there in the manifest
		filename: '{short_name}_v{version}.zip',
		overwriteDest: true
	}
};
