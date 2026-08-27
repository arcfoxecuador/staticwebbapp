/* ── Núcleo de variantes ───────────────────────────────────────────────────
   Es `class-variance-authority` —el motor de variantes que usa shadcn/ui—
   escrito aquí en 40 líneas en vez de instalado.

   No es síndrome de «no inventado aquí». Este proyecto tiene cuatro
   dependencias de producción y ninguna es de UI; `cva` son 1,2 kB de lógica
   pura, sin dependencias de Tailwind ni de React, y traerla como paquete
   significaría añadir un `node_modules` nuevo a un `package.json` que cabe en
   pantalla. Lo que se copia de shadcn es la FORMA de la API —`base`,
   `variants`, `defaultVariants`, `compoundVariants`—, que es lo que hace que
   todos los componentes se declaren igual.

   LO QUE ESTO NO HACE, y conviene saberlo: shadcn combina `cva` con
   `tailwind-merge` dentro de un helper `cn()`. `tailwind-merge` resuelve
   conflictos entre utilidades — si el consumidor pasa `px-8` sobre una base con
   `px-6`, gana el del consumidor. Aquí NO está, así que el conflicto lo resuelve
   el orden en que Tailwind emite las clases en la hoja, no el orden del
   atributo. En la práctica basta si cada componente expone variantes para lo que
   de verdad cambia y el `class` extra se reserva para márgenes y colocación,
   que no chocan con la base. Si algún día hace falta el override total,
   `tailwind-merge` es LA dependencia a añadir — y hay que configurarla con los
   colores de marca (`extendTailwindMerge`), porque no conoce tus tokens.

   Astro `class:list` ya hace el trabajo de `clsx` (aplana, descarta falsy), así
   que un `cn()` propio sería una capa de más: estas funciones devuelven una
   cadena y se le pasa a `class:list` como un elemento más. */

type MapaDeVariantes = Record<string, Record<string, string>>;

/** Las props de variante que acepta un componente construido con `variantes`. */
export type PropsDeVariante<T> = T extends (props: infer P) => string
  ? Omit<NonNullable<P>, 'class'>
  : never;

interface Config<V extends MapaDeVariantes> {
  variants?: V;
  defaultVariants?: { [K in keyof V]?: keyof V[K] };
  /* Reglas que sólo aplican cuando coincide una COMBINACIÓN. Es lo que evita
     tener que declarar `primario-grande` como una variante inventada. */
  compoundVariants?: Array<{ [K in keyof V]?: keyof V[K] } & { class: string }>;
}

export function variantes<V extends MapaDeVariantes>(base: string, config: Config<V> = {}) {
  const { variants, defaultVariants, compoundVariants } = config;

  return (props: { [K in keyof V]?: keyof V[K] | null | undefined } & { class?: string } = {}) => {
    const salida: string[] = [base];
    /* Se compara contra `undefined`/`null` y no con `||`: una variante puede
       llamarse legítimamente con una clave falsy, y con `||` el valor por
       defecto se colaría encima. */
    const elegidas: Record<string, unknown> = { ...defaultVariants };
    for (const clave in props) {
      if (clave === 'class') continue;
      const v = (props as Record<string, unknown>)[clave];
      if (v !== undefined && v !== null) elegidas[clave] = v;
    }

    if (variants) {
      for (const grupo in variants) {
        const clave = elegidas[grupo];
        if (clave == null) continue;
        const clases = variants[grupo][clave as string];
        if (clases) salida.push(clases);
      }
    }

    if (compoundVariants) {
      for (const regla of compoundVariants) {
        const { class: clase, ...condiciones } = regla as Record<string, unknown> & { class: string };
        const encaja = Object.keys(condiciones).every(
          (k) => elegidas[k] === (condiciones as Record<string, unknown>)[k],
        );
        if (encaja && clase) salida.push(clase);
      }
    }

    /* El `class` del consumidor va SIEMPRE al final. No gana por orden en el
       atributo —eso lo decide la hoja—, pero deja la intención escrita y es lo
       que hará falta el día que entre `tailwind-merge`. */
    if (props.class) salida.push(props.class);

    return salida.filter(Boolean).join(' ');
  };
}

/* Cardinales en letra, para los titulares que cuentan lo que tienen debajo.

   Existe porque es el error más fácil de cometer y el más difícil de ver: se
   escribe «Cuatro servicios» en un titular, alguien publica el quinto, y la
   frase pasa a mentir sin que nada avise. Con esto el titular se compone
   `{enLetra(servicios.length)} servicios` y no puede desincronizarse.

   En letra y no en cifra porque es prosa: en una frase corrida se escribe
   «Cuatro caminos», no «4 caminos». Por encima de diez devuelve la cifra, que
   es lo que hace cualquier manual de estilo en español. */
const CARDINALES = [
  'Ningún', 'Un', 'Dos', 'Tres', 'Cuatro', 'Cinco',
  'Seis', 'Siete', 'Ocho', 'Nueve', 'Diez',
];
export const enLetra = (n: number) => CARDINALES[n] ?? String(n);

/** Fecha larga en español, sin dependencias. Una sola forma en todo el sitio:
    dos formatos distintos en dos páginas es el tipo de detalle que delata que
    nadie está mirando el conjunto. */
export const fechaLarga = (d: Date, locale = 'es-EC') =>
  d.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
