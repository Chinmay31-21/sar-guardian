import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const RELOAD_OVERLAY_MIN_MS = 1200;

const isBrowserRefresh = () => {
	const navigationEntry = performance.getEntriesByType("navigation")[0] as
		| PerformanceNavigationTiming
		| undefined;
	return navigationEntry?.type === "reload";
};

const showReloadOverlay = () => {
	const host = document.createElement("div");
	host.id = "sar-refresh-overlay";
	host.style.position = "fixed";
	host.style.inset = "0";
	host.style.zIndex = "9999";
	host.style.background = "#0d1117";
	host.style.opacity = "1";
	host.style.transition = "opacity 220ms ease";

	const iframe = document.createElement("iframe");
	iframe.src = "/reload.html?embedded=1";
	iframe.title = "System refresh overlay";
	iframe.style.width = "100%";
	iframe.style.height = "100%";
	iframe.style.border = "0";
	iframe.style.display = "block";

	host.appendChild(iframe);
	document.body.appendChild(host);

	return () => {
		host.style.opacity = "0";
		window.setTimeout(() => {
			host.remove();
		}, 240);
	};
};

const removeOverlay = isBrowserRefresh() ? showReloadOverlay() : null;

createRoot(document.getElementById("root")!).render(<App />);

if (removeOverlay) {
	window.setTimeout(() => {
		removeOverlay();
	}, RELOAD_OVERLAY_MIN_MS);
}
