import type { ElementAction } from "./types";

// Smart action executor — uses the inferred action type
export function executeSmartAction(action: ElementAction, target: HTMLElement) {
  // Scroll into view first, then act
  target.scrollIntoView({ behavior: "smooth", block: "center" });

  switch (action) {
    case "navigate":
      // Links: click immediately so the browser follows the href
      target.click();
      break;
    case "click":
      target.click();
      break;
    case "focus":
      target.focus();
      break;
    case "toggle":
      target.click();
      break;
    case "expand":
      if (target.tagName.toLowerCase() === "details") {
        (target as HTMLDetailsElement).open = !(target as HTMLDetailsElement).open;
      } else {
        target.click();
      }
      break;
    case "scroll-to":
      // Already scrolled above
      break;
  }
}

export function highlightElement(target: HTMLElement) {
  const prev = {
    boxShadow: target.style.boxShadow,
    transition: target.style.transition,
  };
  target.style.boxShadow = "0 0 0 2px #a855f7, 0 0 12px rgba(168,85,247,0.25)";
  target.style.transition = "box-shadow 0.3s ease";
  setTimeout(() => {
    target.style.boxShadow = prev.boxShadow;
    target.style.transition = prev.transition;
  }, 2500);
}

// Built-in command executor
export function executeAction(action: string) {
  switch (action) {
    case "dark-mode": {
      const id = "ghost-dark-engine";
      let style = document.getElementById(id);
      if (style) {
        style.remove();
      } else {
        style = document.createElement("style");
        style.id = id;
        style.textContent = `
          html { filter: invert(1) hue-rotate(180deg) !important; background: white; }
          img, video, iframe, canvas, svg, [style*="background-image"] {
            filter: invert(1) hue-rotate(180deg) !important;
          }
        `;
        document.head.appendChild(style);
      }
      break;
    }
    case "hide-images": {
      const id = "ghost-hide-images";
      let style = document.getElementById(id);
      if (style) {
        style.remove();
      } else {
        style = document.createElement("style");
        style.id = id;
        style.textContent = `img, video, svg { opacity: 0.1 !important; }`;
        document.head.appendChild(style);
      }
      break;
    }
    case "read-mode": {
      const id = "ghost-read-mode";
      let style = document.getElementById(id);
      if (style) {
        style.remove();
      } else {
        style = document.createElement("style");
        style.id = id;
        style.textContent = `
          body * { max-width: 720px !important; margin-left: auto !important; margin-right: auto !important; }
          nav, aside, footer, header, [role="banner"], [role="navigation"], [role="complementary"] {
            display: none !important;
          }
          body { font-size: 18px !important; line-height: 1.8 !important; font-family: Georgia, serif !important; }
        `;
        document.head.appendChild(style);
      }
      break;
    }
    case "zoom-in": {
      const current = parseFloat(document.body.style.zoom || "1");
      document.body.style.zoom = String(Math.min(current + 0.1, 2));
      break;
    }
    case "zoom-out": {
      const current = parseFloat(document.body.style.zoom || "1");
      document.body.style.zoom = String(Math.max(current - 0.1, 0.5));
      break;
    }
    case "zoom-reset": {
      document.body.style.zoom = "1";
      break;
    }
    case "print": {
      window.print();
      break;
    }
    case "copy-url": {
      navigator.clipboard.writeText(window.location.href);
      break;
    }
    case "fullscreen": {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        document.documentElement.requestFullscreen();
      }
      break;
    }
    case "highlight-links": {
      const id = "ghost-highlight-links";
      let style = document.getElementById(id);
      if (style) {
        style.remove();
      } else {
        style = document.createElement("style");
        style.id = id;
        style.textContent = `a[href] { outline: 2px solid #a855f7 !important; outline-offset: 2px !important; }`;
        document.head.appendChild(style);
      }
      break;
    }
    case "page-info": {
      const links = document.querySelectorAll("a[href]").length;
      const buttons = document.querySelectorAll("button, [role='button']").length;
      const inputs = document.querySelectorAll("input, textarea, select").length;
      const images = document.querySelectorAll("img").length;
      const headings = document.querySelectorAll("h1,h2,h3,h4,h5,h6").length;
      const forms = document.querySelectorAll("form").length;
      alert(
        `Page Info\n\n` +
        `Links: ${links}\n` +
        `Buttons: ${buttons}\n` +
        `Inputs: ${inputs}\n` +
        `Images: ${images}\n` +
        `Headings: ${headings}\n` +
        `Forms: ${forms}\n` +
        `Title: ${document.title}`
      );
      break;
    }
    case "disable-css": {
      const id = "ghost-disable-css";
      const existing = document.getElementById(id);
      if (existing) {
        existing.remove();
        document.querySelectorAll("[data-ghost-disabled-style]").forEach((el) => {
          (el as HTMLElement).removeAttribute("data-ghost-disabled-style");
          (el as HTMLLinkElement).disabled = false;
        });
      } else {
        const marker = document.createElement("meta");
        marker.id = id;
        document.head.appendChild(marker);
        document.querySelectorAll('style, link[rel="stylesheet"]').forEach((el) => {
          if (el.id?.startsWith("ghost-")) return;
          el.setAttribute("data-ghost-disabled-style", "true");
          (el as HTMLLinkElement).disabled = true;
        });
      }
      break;
    }
    case "outline-elements": {
      const id = "ghost-outline-elements";
      let style = document.getElementById(id);
      if (style) {
        style.remove();
      } else {
        style = document.createElement("style");
        style.id = id;
        style.textContent = `* { outline: 1px solid rgba(168,85,247,0.3) !important; }`;
        document.head.appendChild(style);
      }
      break;
    }
    case "scroll-top":
      window.scrollTo({ top: 0, behavior: "smooth" });
      break;
    case "scroll-bottom":
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      break;
  }
}
