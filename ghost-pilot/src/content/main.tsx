import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "../styles/global.css";

// Create shadow DOM container to isolate styles
const hostElement = document.createElement("div");
hostElement.id = "ghostpilot-root";
document.body.appendChild(hostElement);

const shadow = hostElement.attachShadow({ mode: "open" });

// Inject styles into shadow DOM
const styleLink = document.createElement("link");
styleLink.rel = "stylesheet";
styleLink.href = chrome.runtime.getURL("assets/style.css");
shadow.appendChild(styleLink);

// Create React root inside shadow DOM
const mountPoint = document.createElement("div");
mountPoint.id = "ghostpilot-mount";
shadow.appendChild(mountPoint);

ReactDOM.createRoot(mountPoint).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

console.log("GhostPilot loaded. Press ALT+G to activate.");
