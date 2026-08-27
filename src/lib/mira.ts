/* La foto se asoma al puntero. Es el gesto de «siéntate»: el habitáculo
   no es un recorte fijo, responde. Sólo puntero fino —en táctil pelearía
   con el scroll— y nunca en reduced-motion.

   No esconde nada: sin este módulo la foto está igual, quieta. */

const tope = 4;

const armar = (caja: HTMLElement) => {
  if (caja.hasAttribute('data-mira-on')) return;
  caja.setAttribute('data-mira-on', '');

  const mover = (evento: PointerEvent) => {
    const marco = caja.getBoundingClientRect();
    if (marco.width === 0 || marco.height === 0) return;
    const x = (evento.clientX - marco.left) / marco.width - 0.5;
    const y = (evento.clientY - marco.top) / marco.height - 0.5;
    caja.style.setProperty('--mira-x', `${(-x * tope).toFixed(2)}%`);
    caja.style.setProperty('--mira-y', `${(-y * tope * 0.75).toFixed(2)}%`);
  };

  const soltar = () => {
    caja.style.setProperty('--mira-x', '0%');
    caja.style.setProperty('--mira-y', '0%');
  };

  caja.addEventListener('pointermove', mover);
  caja.addEventListener('pointerleave', soltar);
};

export const iniciarMira = () => {
  const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fino = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (reducido || !fino) return;
  document.querySelectorAll<HTMLElement>('[data-mira]').forEach(armar);
};
