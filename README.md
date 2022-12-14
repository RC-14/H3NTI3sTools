# H3NTI3s Tools

This is a browser extension, currently written for chrome (this will probably change in the not so far future),
that adds some stuff to the browser that I think is useful.

If you have a question or think something could be improved feel free to create an issue or a pull request.

## Installation

Because I will not provide releases for this extension because I change stuff too often you'll have to build it yourself and can't install it from a website.

### Prerequisites

[Node.js](https://nodejs.org/) to for npm to install the dependencies.

A programm to run commands. (`cmd` or `powershell` on Windows, `Terminal` on Mac and I Linux users will know what to use - I'll call this terminal from now on)

You downloaded this repo and unpacked it if you downloaded it as an archive. (don't just leave it in your downloads and put it in a special folder in your documents or something like that)

There are no auto updates. You have to download the archive again and overwrite the old files every time you want the newest stuff. (git makes this much easier - use git)

### Build

**This needs to be done every time something changes in the code.**

#### For those who are not familiar with the terminal

Open your terminal and navigate to your local copy of this repo.

`cd <path to repo>` (you can probably drag the folder from the file manager into your terminal to get the path)

I'll just assume that the path to this `README.md` file is now `~/git-repos/H3NTI3sTools/README.md` or for windows users `%USERPROFILE%\git-repos\H3NTI3sTools\README.md`.

In other words: In your terminal you are now inside the `H3NTI3sTools` folder and this `README.md` is inside that folder.

#### The actual build instructions

Run `npm install` to get/update all the dependencies.

After that run `npm run build` to build the project. (this does not pack the extension into a `.crx` file and instead only generates `.js` and `.js.map` files next to the `.ts` files)

### Add the extension to chrome

Open your chrome browser (for example brave or google chrome) and open this URL: [chrome://extensions](chrome://extensions)

Somewhere at the top you should be able to enable developer mode.
Do it.

Now click on the `Load unpacked` button that appeared when you enabled developer mode.

In the new window select the `src` folder of this repo which contains the `manifest.json` file.

The extension should now be added to your browser.
