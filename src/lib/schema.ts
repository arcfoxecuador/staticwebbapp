/* ── JSON-LD ───────────────────────────────────────────────────────────────
   Constructores de nodos schema.org. Se ensamblan con `grafo()` en UN solo
   `<script>` por página.

   POR QUÉ UN `@graph` ÚNICO Y NO VARIOS BLOQUES. Con nodos separados, cada
   bloque repite la organización entera y nada los relaciona: el motor ve seis
   entidades sueltas donde hay una empresa con seis páginas. Con un grafo, la
   organización se declara UNA vez con un `@id` estable y el resto la
   referencia — `{ '@id': ID_ORG }` en vez de treinta líneas duplicadas. Eso es
   lo que produce un panel de conocimiento en vez de un montón de marcado.

   REGLA QUE NO SE NEGOCIA: el JSON-LD no puede decir nada que no diga la
   página. Un dato estructurado que contradice el texto visible es peor que no
   tener datos estructurados — Google lo trata como marcado engañoso. */
import { ORG, SEDES, SITE } from './site';

const url = (path = '/') => new URL(path, SITE).toString();

/** Los dos identificadores raíz. Todo lo demás cuelga de ellos. */
export const ID_ORG = `${SITE}/#organizacion`;
export const ID_SITIO = `${SITE}/#sitio`;

/* El idioma del contenido, en BCP 47. Va en `inLanguage` de cada nodo y en el
   `<html lang>` del layout: si divergen, el motor cree lo que dice el HTML. */
export const IDIOMA = 'es-EC';

/**
 * El nodo de la organización.
 *
 * `@type` es un array a propósito: el primero es el tipo PRECISO y el segundo
 * el genérico. Un tipo más específico que `Organization` habilita campos que el
 * genérico no tiene —`LocalBusiness` da horarios y área de servicio,
 * `ProfessionalService` da catálogo— y los motores usan el más concreto que
 * entiendan. Cámbialo por el que describa de verdad a esta empresa:
 * LocalBusiness · ProfessionalService · FinancialService · MedicalBusiness ·
 * EducationalOrganization · Restaurant · Store…
 */
export function organizacion(tipo = 'AutomotiveBusiness') {
  const sede = SEDES[0];
  return {
    '@type': [tipo, 'Organization'],
    '@id': ID_ORG,
    name: ORG.nombreCorto,
    legalName: ORG.nombreLegal,
    url: url('/'),
    description: ORG.descripcion,
    slogan: ORG.tagline,
    ...(ORG.fundacion ? { foundingDate: ORG.fundacion } : {}),
    /* Apunta a un archivo que EXISTE. Es el error más común de este nodo: se
       escribe la ruta del logo que se piensa subir, nadie lo sube, y el `logo`
       de la organización da 404 en todas las páginas del sitio. */
    logo: { '@type': 'ImageObject', url: url('/marca/logo.svg') },
    image: url('/og/portada.jpg'),
    ...(ORG.email ? { email: ORG.email } : {}),
    ...(ORG.telefono ? { telephone: ORG.telefono } : {}),
    ...(ORG.redes.length ? { sameAs: [...ORG.redes] } : {}),
    ...(sede
      ? {
          /* La calle y la región se OMITEN si no existen, en vez de emitirse
             vacías. Un `streetAddress: ""` es una afirmación —«ésta es la
             dirección»— con la dirección puesta en blanco, y es peor que callar:
             el validador de Google la marca y el dato entra sucio en el grafo. */
          address: SEDES.map((s) => ({
            '@type': 'PostalAddress',
            ...(s.calle ? { streetAddress: s.calle } : {}),
            addressLocality: s.ciudad,
            ...(s.region ? { addressRegion: s.region } : {}),
            addressCountry: s.codigoPais,
          })),
          areaServed: [...new Set(SEDES.map((s) => s.codigoPais))].map((c) => ({
            '@type': 'Country',
            name: c,
          })),
        }
      : {}),
    ...(ORG.email || ORG.telefono
      ? {
          contactPoint: [
            {
              '@type': 'ContactPoint',
              contactType: 'sales',
              ...(ORG.email ? { email: ORG.email } : {}),
              ...(ORG.telefono ? { telephone: ORG.telefono } : {}),
              availableLanguage: [IDIOMA.split('-')[0]],
            },
          ],
        }
      : {}),
  };
}

export function sitioWeb() {
  return {
    '@type': 'WebSite',
    '@id': ID_SITIO,
    url: url('/'),
    name: ORG.nombreCorto,
    inLanguage: IDIOMA,
    publisher: { '@id': ID_ORG },
  };
}

export function pagina(opts: {
  path: string;
  titulo: string;
  descripcion: string;
  tipo?: 'WebPage' | 'CollectionPage' | 'ContactPage' | 'AboutPage' | 'FAQPage';
}) {
  return {
    '@type': opts.tipo ?? 'WebPage',
    '@id': `${url(opts.path)}#pagina`,
    url: url(opts.path),
    name: opts.titulo,
    description: opts.descripcion,
    inLanguage: IDIOMA,
    isPartOf: { '@id': ID_SITIO },
    about: { '@id': ID_ORG },
  };
}

/** Migas. El primer elemento es siempre la portada; no la escribas a mano en
    cada llamada — se añade aquí para que ninguna página se la olvide. */
export function migas(items: { nombre: string; path: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: [{ nombre: 'Inicio', path: '/' }, ...items].map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.nombre,
      item: url(it.path),
    })),
  };
}

/** Un servicio del catálogo. NO lleva `offers` con precio si el precio no está
    publicado en la página: declarar un precio que no se ve es marcado engañoso. */
export function servicio(s: {
  slug: string;
  nombre: string;
  descripcion: string;
  categoria?: string;
  precio?: { valor: number; moneda: string };
}) {
  return {
    '@type': 'Service',
    '@id': `${url(`/modelos/${s.slug}`)}#modelo`,
    name: s.nombre,
    description: s.descripcion,
    url: url(`/modelos/${s.slug}`),
    ...(s.categoria ? { serviceType: s.categoria } : {}),
    provider: { '@id': ID_ORG },
    ...(s.precio
      ? {
          offers: {
            '@type': 'Offer',
            price: s.precio.valor,
            priceCurrency: s.precio.moneda,
          },
        }
      : {}),
  };
}

export function listaDeServicios(items: { slug: string; nombre: string }[], nombre = 'Modelos') {
  return {
    '@type': 'ItemList',
    name: nombre,
    itemListElement: items.map((s, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: url(`/modelos/${s.slug}`),
      name: s.nombre,
    })),
  };
}

/** `FAQPage` desde la MISMA lista que pinta el acordeón. Es lo que garantiza
    que la respuesta citada y la respuesta visible sean la misma frase. */
export function faq(items: readonly { p: string; r: string }[]) {
  return {
    '@type': 'FAQPage',
    mainEntity: items.map((it) => ({
      '@type': 'Question',
      name: it.p,
      acceptedAnswer: { '@type': 'Answer', text: it.r },
    })),
  };
}

export function articulo(a: {
  titulo: string;
  descripcion: string;
  path: string;
  fecha: Date | string;
  actualizado?: Date | string;
  autor: string;
  cargo?: string;
  imagen?: string;
}) {
  const iso = (d: Date | string) => (d instanceof Date ? d.toISOString() : d);
  return {
    '@type': 'Article',
    '@id': `${url(a.path)}#articulo`,
    headline: a.titulo,
    description: a.descripcion,
    url: url(a.path),
    datePublished: iso(a.fecha),
    /* `dateModified` cae a `datePublished` cuando no hay revisión. Es un campo
       de frescura: los motores generativos lo usan para decidir si citar esto o
       algo más nuevo, así que mentir aquí se paga. */
    dateModified: iso(a.actualizado ?? a.fecha),
    inLanguage: IDIOMA,
    ...(a.imagen ? { image: url(a.imagen) } : {}),
    author: {
      '@type': 'Person',
      name: a.autor,
      ...(a.cargo ? { jobTitle: a.cargo } : {}),
      worksFor: { '@id': ID_ORG },
    },
    publisher: { '@id': ID_ORG },
    isPartOf: { '@id': ID_SITIO },
  };
}

/**
 * Una persona del equipo. Sólo entran las que tienen `bio`: un `Person` cuyo
 * único dato es el nombre no le da al motor nada que citar y engorda el grafo
 * con entidades vacías.
 */
export function persona(p: { nombre: string; cargo: string; bio: string; path?: string }) {
  const base = p.path ?? '/nosotros';
  return {
    '@type': 'Person',
    '@id': `${url(base)}#${p.nombre.toLowerCase().replace(/\s+/g, '-')}`,
    name: p.nombre,
    jobTitle: p.cargo,
    description: p.bio,
    worksFor: { '@id': ID_ORG },
  };
}

/** Envuelve los nodos en un solo `@graph`. Devuelve una cadena ya serializada:
    `JSON.stringify` escapa lo que haya que escapar, así que una comilla en una
    descripción no puede romper el bloque. Se inyecta con `set:html`. */
export function grafo(...nodos: object[]) {
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': nodos });
}
