export const $ = (id) => document.getElementById(id);
export const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
};
export const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
export const fmtDate = (iso) => {
  const [y, m, d] = String(iso).slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};

// Iconos monocromos estilo Dashicons (SVG inline, 20×20, color heredado).
const svg = (paths) => `<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">${paths}</svg>`;
export const ICONS = {
  dashboard: svg('<path d="M10 2 1.8 9.2h2.4V18h4.3v-5.2h3V18h4.3V9.2h2.4L10 2z"/>'),
  posts: svg('<path d="M10 1.6c-2.5 0-4.5 2-4.5 4.5 0 3 3.3 6.7 4.5 8 1.2-1.3 4.5-5 4.5-8 0-2.5-2-4.5-4.5-4.5zm0 6.2a1.8 1.8 0 1 1 0-3.6 1.8 1.8 0 0 1 0 3.6z"/><path d="M9.2 13.6h1.6l-.4 4.8h-.8l-.4-4.8z"/>'),
  media: svg('<path d="M2.5 4v12h15V4h-15zM4 5.5h12v9H4v-9z"/><path d="M5.3 13l2.9-3.9 2.1 2.7 1.5-1.9 2.8 3.1H5.3z"/><circle cx="7.1" cy="7.9" r="1.1"/>'),
  pages: svg('<path d="M5 2h6v5h4v11H5V2z"/><path d="M12 2l3 3h-3V2z"/>'),
  careers: svg('<path d="M10 3 1 7.1l9 4.1 7.2-3.3v4.3h1.6v-5L10 3z"/><path d="M5 10v3c0 1.6 2.2 2.9 5 2.9s5-1.3 5-2.9v-3l-5 2.3L5 10z"/>'),
  appearance: svg('<path d="M16.5 2.1 18 3.6l-7.7 7.8-1.6-1.5 7.8-7.8z"/><path d="M8 10.4c-1.9-.2-2.7 1-3.3 2.2-.5 1-1 2.1-2.6 2.6 1 1.4 3.4 2 5 1.2 1.4-.7 2-2.4 1.6-4.3L8 10.4z"/>'),
  agent: svg('<path d="M7.5 2 9 6.5 13.5 8 9 9.5 7.5 14 6 9.5 1.5 8 6 6.5 7.5 2z"/><path d="M14.5 10l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z"/>'),
  settings: svg('<path d="M10 6.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zm0 2a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z"/><path d="M8.8 1.5 8.4 3.2a6.9 6.9 0 0 0-1.6.9L5.1 4.4 3.5 7.2l1.3 1.1a7 7 0 0 0 0 1.4l-1.3 1.1 1.6 2.8 1.7-.7c.5.4 1 .7 1.6.9l.4 1.7h3.2l.4-1.7c.6-.2 1.1-.5 1.6-.9l1.7.7 1.6-2.8-1.3-1.1a7 7 0 0 0 0-1.4l1.3-1.1-1.6-2.8-1.7.7a6.9 6.9 0 0 0-1.6-.9l-.4-1.7H8.8z"/>'),
  automation: svg('<path d="M7 1.5h6v2H7zM9 3.5h2V5H9z"/><path d="M4.5 5h11A1.5 1.5 0 0 1 17 6.5v9A1.5 1.5 0 0 1 15.5 17h-11A1.5 1.5 0 0 1 3 15.5v-9A1.5 1.5 0 0 1 4.5 5zm2 3a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6zm7 0a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6zM7 12.5h6V14H7z"/><path d="M1.5 8.5h1.2v4H1.5zm15.8 0h1.2v4h-1.2z"/>'),
  plus: svg('<path d="M9 3h2v6h6v2h-6v6H9v-6H3V9h6V3z"/>'),
  intakes: svg('<path d="M6 1.5h1.6V3H6zm6.4 0H14V3h-1.6z"/><path d="M3 3.5h14A1.5 1.5 0 0 1 18.5 5v11.5A1.5 1.5 0 0 1 17 18H3a1.5 1.5 0 0 1-1.5-1.5V5A1.5 1.5 0 0 1 3 3.5zM3 8v8.5h14V8H3z"/><path d="M5.5 9.8h2.2V12H5.5zm3.4 0h2.2V12H8.9zm3.4 0h2.2V12h-2.2zM5.5 13.2h2.2v2.2H5.5zm3.4 0h2.2v2.2H8.9z"/>'),
  review: svg('<path d="M4 2h9l3 3v13H4V2zm1.5 1.5v13h9V6h-2.5V3.5h-6.5z"/><path d="m8.9 13.4-2.3-2.3 1.1-1.1 1.2 1.2 3.4-3.4 1.1 1.1-4.5 4.5z"/>'),
  team: svg('<path d="M7 9.2A2.6 2.6 0 1 0 7 4a2.6 2.6 0 0 0 0 5.2zm6 0A2.6 2.6 0 1 0 13 4a2.6 2.6 0 0 0 0 5.2zM7 10.6c-2.4 0-4.6 1.2-4.6 3.1V16h9.2v-2.3c0-1.9-2.2-3.1-4.6-3.1zm6 0c-.4 0-.8 0-1.2.1 1 .8 1.6 1.8 1.6 3v2.3h4.2v-2.3c0-1.9-2.2-3.1-4.6-3.1z"/>'),
  brand: svg('<path d="M10.6 2.2 3 5.4v4.2c0 4 2.9 6.9 7 8.2 4.1-1.3 7-4.2 7-8.2V5.4l-7.6-3.2a1 1 0 0 0-.8 0zM9 12.3 6.4 9.7l1.2-1.2L9 9.9l3.4-3.4 1.2 1.2L9 12.3z"/>'),
};
