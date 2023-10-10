# H3NTI3sTools
A Firefox Extension with useful stuff. (at least I think so)

## Install

### Firefox

Note: May lose data in some scenarios but the extension doesn't store anything of value so that's not really a problem.

1. Clone the repo.
2. Run `npm i && npm run build` in the root folder of the repo.
3. Open `about:debugging#/runtime/this-firefox` (aka. Debug Add-ons) in Firefox.
4. Load the `manifest.json` in the `build` folder of the repo as a temporary Add-on.

### Firefox Develper Edition (what I use)

Note: The method for Firefox also works but in the developer edition there is another way which isn't "temporary".

1. Clone the repo.
2. Run `npm i && npm run build && npm run package` in the root folder of the repo.
3. Open `about:config` (aka. Advanced Preferences) in Firefox Developer Edition.
4. Read the warning and rememer not to change random values because "hehe, funny".
5. Search for the Boolean `xpinstall.signatures.required` and change its value to `false`. (Create it if it's not there.)
6. Restart Firefox Developer Edition.
7. Open `about:addons` (aka. Add-ons Manager) in Firefox Developer Edition.
8. Click on the button with the gear icon and `Install Add-on From File...`.
9. Select the ZIP file in the `dist` folder of the repo.

### Anything else

Ask me but I may tell you to figure it out yourself.

## Update

### Firefox

1. Run `git pull --all` in the root of the repo.
3. Open `about:debugging#/runtime/this-firefox` (aka. Debug Add-ons) in Firefox.
4. Load the `manifest.json` in the `build` folder of the repo as a temporary Add-on.
6. Restart Firefox. (optional but recommended)

### Firefox Developer Edition

1. Run `git pull --all` in the root of the repo.
2. Run `npm i && npm run build && npm run package` in the root folder of the repo.
7. Open `about:addons` (aka. Add-ons Manager) in Firefox Developer Edition.
8. Click on the button with the gear icon and `Install Add-on From File...`.
9. Select the ZIP file in the `dist` folder of the repo.
6. Restart Firefox Developer Edition. (optional but recommended)

### Anything else

You can probably do a `git pull --all` in the repo and repeat the steps you used to install the extension (except cloning the repo) and restart the browser afterwards.

As I already wrote above: Ask me if you have issues but I may tell you to figure it out yourself.

## Uninstall

Why are you even here?

Just click on the uninstall/remove button.
