/* ── SECUENCIAS 360 ────────────────────────────────────────────────────────
   Viven en su propio módulo PORQUE `imagenes.ts` lo importa media aplicación.
   Un glob eager de 240 fotos ahí las arrastraría a cada ficha, al mosaico y
   al cierre. Este archivo sólo lo importa la portada. */

import type { ImageMetadata } from 'astro';

const ORBITAS = import.meta.glob<{ default: ImageMetadata }>(
  '../assets/orbitas/*.{webp,avif}',
  { eager: true },
);

const EXTENSIONES = ['webp', 'avif'] as const;

/** Un fotograma concreto (`t5-negro-00`). La ficha lo usa como `archivo`. */
export function imagenOrbita(slug: string): ImageMetadata | undefined {
  const limpio = slug.replace(/\.(webp|avif)$/, '');
  for (const ext of EXTENSIONES) {
    const encontrado = ORBITAS[`../assets/orbitas/${limpio}.${ext}`];
    if (encontrado) return encontrado.default;
  }
  return undefined;
}

/** URLs ya procesadas, en orden. El JS del plato cambia el `src` con esta lista. */
export function urlsDeOrbita(prefijo: string, cantidad: number): string[] {
  const urls: string[] = [];
  for (let i = 0; i < cantidad; i++) {
    const imagen = imagenOrbita(`${prefijo}-${String(i).padStart(2, '0')}`);
    if (imagen) urls.push(imagen.src);
  }
  return urls;
}

/** Primer frame (LCP del plato) + el resto como URLs. Sin listar 240 archivos. */
export function resolverOrbita(
  prefijo: string,
  cantidad: number,
): { imagen: ImageMetadata; urls: string[] } | undefined {
  const imagen = imagenOrbita(`${prefijo}-00`);
  const urls = urlsDeOrbita(prefijo, cantidad);
  if (!imagen || urls.length === 0) return undefined;
  return { imagen, urls };
}
