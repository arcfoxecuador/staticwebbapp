import { api } from "./api.js";

// Caché de carreras compartida por la paleta, el Escritorio y las pantallas de
// Carreras. Antes las cuatro repetían el mismo `if (!CAREERS) { fetch; asignar }`;
// aquí ese idiom vive una sola vez.

export let CAREERS = null, CAREERFORM = null, CAREERSTATES = null;

// Carga las carreras si no están en caché. Devuelve el mapa slug → título.
// Propaga el error: cada pantalla decide cómo avisar.
export async function ensureCareers() {
  if (CAREERS) return CAREERS;
  const d = await api("/api/careers");
  CAREERS = d.careers; CAREERFORM = d.form; CAREERSTATES = d.states;
  return CAREERS;
}

// Tras crear una carrera: la siguiente lectura se relee del repo.
export function invalidateCareers() { CAREERS = null; }

