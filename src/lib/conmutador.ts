/* Los radios pintan la foto: el fundido vive en CSS. Esta isla no anima el
   cruce — el translate + clip-path se trababa a medias y no se veía limpio.

   Marca el view-transition-name de la foto visible (el auto de la portada
   viaja a su ficha). En gama e interior, además pasa sola a la siguiente
   foto: el radio sigue siendo la fuente de verdad, el reloj sólo lo marca. */

const PASO_MS = 3000;

const indiceActivo = (radios: HTMLInputElement[]) =>
  radios.findIndex((radio) => radio.checked);

const marcarTransicion = (fotos: HTMLElement[], i: number) => {
  for (const [j, foto] of fotos.entries()) {
    const img = foto.querySelector('img');
    if (!img) continue;
    const nombre = img.getAttribute('data-transicion');
    if (nombre && j === i) img.style.setProperty('view-transition-name', nombre);
    else img.style.setProperty('view-transition-name', 'none');
  }
};

const elegir = (radios: HTMLInputElement[], i: number) => {
  const radio = radios[i];
  if (!radio || radio.checked) return;
  radio.checked = true;
  radio.dispatchEvent(new Event('input', { bubbles: true }));
  radio.dispatchEvent(new Event('change', { bubbles: true }));
};

const pasarSolo = (raiz: HTMLElement, radios: HTMLInputElement[]) => {
  if (!raiz.hasAttribute('data-pasa')) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let pausa = false;
  let aLaVista = false;
  let reloj = 0;

  const arrancar = () => {
    window.clearInterval(reloj);
    reloj = window.setInterval(() => {
      if (pausa || !aLaVista || document.hidden) return;
      const i = indiceActivo(radios);
      elegir(radios, (Math.max(0, i) + 1) % radios.length);
    }, PASO_MS);
  };

  const parar = () => window.clearInterval(reloj);

  /* En táctil el hover se queda pegado y el reloj no volvería a correr.
     Sólo pausamos con puntero fino. Un clic ya reinicia el intervalo. */
  const fino = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (fino) {
    raiz.addEventListener('pointerenter', () => {
      pausa = true;
    });
    raiz.addEventListener('pointerleave', () => {
      pausa = false;
      arrancar();
    });
  }

  for (const radio of radios) {
    radio.addEventListener('change', arrancar);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) parar();
    else if (aLaVista && !pausa) arrancar();
  });

  const observador = new IntersectionObserver(
    (entradas) => {
      const ahora = entradas.some((e) => e.isIntersecting && e.intersectionRatio >= 0.3);
      if (ahora === aLaVista) return;
      aLaVista = ahora;
      if (aLaVista) arrancar();
      else parar();
    },
    { threshold: [0, 0.3, 0.6] },
  );
  observador.observe(raiz);
};

const armar = (raiz: HTMLElement) => {
  if (raiz.hasAttribute('data-nombres')) return;

  const radios = [...raiz.querySelectorAll<HTMLInputElement>('.conmutador-radio')];
  const fotos = [...raiz.querySelectorAll<HTMLElement>('.pila-item')];
  if (radios.length < 2 || fotos.length < 2) return;

  raiz.setAttribute('data-nombres', '');

  let visible = indiceActivo(radios);
  if (visible < 0) visible = 0;
  marcarTransicion(fotos, visible);

  for (const radio of radios) {
    radio.addEventListener('change', () => {
      const hacia = indiceActivo(radios);
      if (hacia < 0) return;
      marcarTransicion(fotos, hacia);
    });
  }

  /* El clic en el label enfoca el radio. Aunque el radio esté fixed,
     Safari a veces scroll-a-foco igual. Activamos el radio a mano y
     dejamos el scroll donde está. Un <a> dentro de la ficha (Ver ficha)
     no se intercepta: ese clic tiene que navegar. */
  raiz.addEventListener('click', (evento) => {
    const destino = evento.target;
    if (!(destino instanceof Element)) return;
    if (destino.closest('a')) return;
    const etiqueta = destino.closest('label');
    if (!(etiqueta instanceof HTMLLabelElement) || !etiqueta.htmlFor) return;
    const radio = raiz.querySelector<HTMLInputElement>(`#${CSS.escape(etiqueta.htmlFor)}`);
    if (!radio || radio.disabled) return;
    evento.preventDefault();
    if (radio.checked) return;
    radio.checked = true;
    radio.dispatchEvent(new Event('input', { bubbles: true }));
    radio.dispatchEvent(new Event('change', { bubbles: true }));
  });

  pasarSolo(raiz, radios);
};

export const iniciarConmutadores = () => {
  document.querySelectorAll<HTMLElement>('[data-slot="conmutador"]').forEach(armar);
};
