/* La isla pinta el modelo activo en TODA la portada: escenario, hero, mosaico,
   cierre, formulario y cabecera. El giro y el color siguen siendo locales al
   plato. Sin JS se queda el primer modelo, que es el que el HTML ya muestra. */

const panelesDe = () =>
  Array.from(document.querySelectorAll<HTMLElement>('[data-modelo-panel]'));

const idDe = (panel: HTMLElement | undefined) => panel?.dataset.modeloPanel ?? '';

let yaPinto = false;

const activarVistas = (id: string) => {
  document.querySelectorAll<HTMLElement>('[data-modelo-vista]').forEach((vista) => {
    const activa = vista.dataset.modeloVista === id;
    vista.toggleAttribute('data-activo', activa);
    vista.setAttribute('aria-hidden', activa ? 'false' : 'true');
    if (vista.hasAttribute('data-oculta')) vista.hidden = !activa;
    if (activa && yaPinto && vista.dataset.slot === 'mosaico') {
      vista.classList.remove('prende');
      void vista.offsetWidth;
      vista.classList.add('prende');
    }
  });
};

const pintarNombres = (panel: HTMLElement) => {
  const nombre = panel.getAttribute('aria-label') ?? '';
  const corto = panel.dataset.modeloCorto ?? nombre;
  const rotulo = panel.dataset.rotulo ?? '';
  document.querySelectorAll('[data-modelo-nombre]').forEach((nodo) => {
    nodo.textContent = nombre;
  });
  document.querySelectorAll('[data-modelo-nombre-corto]').forEach((nodo) => {
    nodo.textContent = corto;
  });
  document.querySelectorAll('[data-modelo-rotulo]:not([data-modelo-panel])').forEach((nodo) => {
    nodo.textContent = rotulo;
  });
};

const pintarCabecera = (id: string) => {
  document.querySelectorAll<HTMLElement>('[data-cambia-modelo]').forEach((enlace) => {
    const activo = enlace.dataset.cambiaModelo === id;
    if (activo) enlace.setAttribute('aria-current', 'true');
    else enlace.removeAttribute('aria-current');
    enlace.classList.toggle('esta-activo', activo);
  });
  document.querySelectorAll('details[open]').forEach((caja) => {
    if (caja.querySelector('[data-cambia-modelo]')) caja.removeAttribute('open');
  });
};

const pintarFormulario = (id: string) => {
  const selector = document.querySelector<HTMLSelectElement>('select[name="modelo"]');
  if (!selector || !Array.from(selector.options).some((opcion) => opcion.value === id)) return;
  if (selector.value === id) return;
  selector.value = id;
  selector.dispatchEvent(new Event('change', { bubbles: true }));
};

const escribirHash = (id: string) => {
  if (typeof history.replaceState !== 'function') return;
  const url = new URL(window.location.href);
  if (url.hash === `#${id}`) return;
  url.hash = id;
  history.replaceState(null, '', `${url.pathname}${url.search}#${id}`);
};

const seleccionarModelo = (indice: number) => {
  const paneles = panelesDe();
  if (!paneles.length) return;
  const actual = (indice + paneles.length) % paneles.length;
  const panel = paneles[actual];
  const id = idDe(panel);
  if (!panel || !id) return;

  paneles.forEach((item, i) => {
    item.hidden = i !== actual;
  });
  activarVistas(id);
  pintarNombres(panel);
  pintarCabecera(id);
  pintarFormulario(id);
  escribirHash(id);
};

const indiceDe = (id: string) => panelesDe().findIndex((panel) => idDe(panel) === id);

const indiceActivo = () => {
  const visible = panelesDe().findIndex((panel) => !panel.hidden);
  return visible < 0 ? 0 : visible;
};

const irA = (id: string) => {
  const indice = indiceDe(id);
  if (indice < 0) return;
  seleccionarModelo(indice);
};

const idDesdeHash = () => {
  const bruto = window.location.hash.replace(/^#/, '');
  return indiceDe(bruto) >= 0 ? bruto : '';
};

const montarGiro = (panel: HTMLElement) => {
  const colores = Array.from(panel.querySelectorAll<HTMLButtonElement>('[data-color-control]'));
  const grupos = Array.from(panel.querySelectorAll<HTMLElement>('[data-color]'));
  const giro = panel.querySelector<HTMLElement>('[data-giro]');
  let indiceFotograma = 0;
  let inicioX: number | null = null;
  let ultimoPaso = 0;

  const grupoActivo = () => panel.querySelector<HTMLElement>('[data-color].esta-activo');
  const mostrarFotograma = (direccion: number) => {
    const fotogramas = Array.from(grupoActivo()?.querySelectorAll<HTMLElement>('[data-fotograma]') ?? []);
    if (fotogramas.length < 2) return;
    indiceFotograma = (indiceFotograma + direccion + fotogramas.length) % fotogramas.length;
    fotogramas.forEach((fotograma, i) => fotograma.classList.toggle('esta-activo', i === indiceFotograma));
  };

  colores.forEach((control) => {
    control.addEventListener('click', () => {
      const color = control.dataset.colorControl;
      colores.forEach((item) => {
        const activo = item === control;
        item.classList.toggle('esta-activo', activo);
        item.setAttribute('aria-pressed', activo ? 'true' : 'false');
      });
      grupos.forEach((grupo) => {
        const activo = grupo.dataset.color === color;
        grupo.classList.toggle('esta-activo', activo);
        grupo.setAttribute('aria-hidden', activo ? 'false' : 'true');
      });
      indiceFotograma = 0;
    });
  });

  giro?.addEventListener('keydown', (evento) => {
    if (evento.key !== 'ArrowLeft' && evento.key !== 'ArrowRight') return;
    evento.preventDefault();
    mostrarFotograma(evento.key === 'ArrowLeft' ? -1 : 1);
  });
  giro?.addEventListener('pointerdown', (evento) => {
    inicioX = evento.clientX;
    ultimoPaso = 0;
    giro.setPointerCapture(evento.pointerId);
  });
  giro?.addEventListener('pointermove', (evento) => {
    if (inicioX === null) return;
    const paso = Math.trunc((evento.clientX - inicioX) / 34);
    if (paso === ultimoPaso) return;
    mostrarFotograma(paso > ultimoPaso ? 1 : -1);
    ultimoPaso = paso;
  });
  giro?.addEventListener('pointerup', () => {
    inicioX = null;
  });
  giro?.addEventListener('pointercancel', () => {
    inicioX = null;
  });
};

document.querySelectorAll<HTMLButtonElement>('[data-modelo-anterior]').forEach((boton) => {
  boton.addEventListener('click', () => seleccionarModelo(indiceActivo() - 1));
});
document.querySelectorAll<HTMLButtonElement>('[data-modelo-siguiente]').forEach((boton) => {
  boton.addEventListener('click', () => seleccionarModelo(indiceActivo() + 1));
});
document.querySelectorAll<HTMLElement>('[data-cambia-modelo]').forEach((enlace) => {
  enlace.addEventListener('click', (evento) => {
    const id = enlace.dataset.cambiaModelo;
    if (!id || indiceDe(id) < 0) return;
    evento.preventDefault();
    irA(id);
  });
});

panelesDe().forEach(montarGiro);

const inicial = idDesdeHash();
seleccionarModelo(inicial ? indiceDe(inicial) : 0);
yaPinto = true;

window.addEventListener('hashchange', () => {
  const id = idDesdeHash();
  if (id) irA(id);
});
