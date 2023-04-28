module.exports = {
	sourceDir: "dist",
	artifactsDir: "build",
	build: {
		// {path.to.value} will be replaced with whatever value is there in the manifest
		filename: "{short_name}_v{version}.zip",
		overwriteDest: true
	},
	run: {
		target: ["firefox-desktop"],
		firefox: "firefoxdeveloperedition",
		firefoxProfile: "dev-edition-default",
		keepProfileChanges: false
	}
}
