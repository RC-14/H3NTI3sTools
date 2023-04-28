import { qs } from "../../utils.js";

if (location.pathname === "/" || location.pathname === "") {
	document.addEventListener("keypress", (event) => {
		if (event.code === "Enter") qs<HTMLInputElement>("input#searchButton")?.click();
	});
}
