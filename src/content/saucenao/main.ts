import { qs } from "/src/lib/utils";

if (location.pathname === "/") {
	document.addEventListener("keypress", (event) => {
		if (event.code === "Enter") qs<HTMLInputElement>("input#searchButton")?.click();
	});
}
