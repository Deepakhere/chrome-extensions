import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/global.css";

const root = document.createElement("div");
root.id = "ghost-navigator-root";
const shadow = root.attachShadow({ mode: "open" });

// Inject CSS into Shadow DOM so styles are isolated from the host page
const styleLink = document.createElement("link");
styleLink.rel = "stylesheet";

if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL) {
  // Production: running as a Chrome extension content script
  styleLink.href = chrome.runtime.getURL("assets/main.css");
} else {
  // Development: running via Vite dev server
  styleLink.href = "/src/styles/global.css";
}

shadow.appendChild(styleLink);

const renderRoot = document.createElement("div");
shadow.appendChild(renderRoot);

document.body.appendChild(root);

ReactDOM.createRoot(renderRoot).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
