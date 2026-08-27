import { CSRF } from "./state.js";

// fetch con manejo de sesión caducada, CSRF y errores JSON del panel. El error
// lanzado conserva status y data (p. ej. usos de una imagen en un 409).
export async function api(path, opts = {}) {
  if (opts.method && opts.method !== "GET") {
    opts.headers = { ...(opts.headers || {}), "X-CSRF-Token": CSRF };
  }
  const res = await fetch(path, opts);
  if (res.status === 401) { location.href = "/login"; throw new Error("Sesión caducada"); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Error ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}
