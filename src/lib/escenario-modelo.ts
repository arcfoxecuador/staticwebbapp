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

const seleccionarModelo = (indice: number, actualizarUrl = true) => {
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
  if (actualizarUrl) escribirHash(id);
  precargarGrupo(panel.querySelector('[data-color].esta-activo'));
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

const urlsDe = (grupo: HTMLElement | null): string[] => {
  const bruto = grupo?.dataset.orbita;
  if (!bruto) return [];
  try {
    const leido = JSON.parse(bruto) as unknown;
    return Array.isArray(leido) ? leido.filter((u): u is string => typeof u === 'string') : [];
  } catch {
    return [];
  }
};

const srcDe = (img: HTMLImageElement) => img.currentSrc || img.getAttribute('src') || '';

const mismaUrl = (img: HTMLImageElement, url: string) => {
  const actual = srcDe(img);
  return actual === url || actual.endsWith(url) || url.endsWith(actual);
};

const precargadas = new Set<string>();

const precargar = (urls: string[]) => {
  const clave = urls[0] ?? '';
  if (!clave || precargadas.has(clave)) return;
  precargadas.add(clave);
  for (const url of urls) {
    const precarga = new Image();
    precarga.src = url;
  }
};

const precargarGrupo = (grupo: HTMLElement | null) => {
  precargar(urlsDe(grupo));
};

const capasDe = (grupo: HTMLElement | null) =>
  Array.from(grupo?.querySelectorAll<HTMLImageElement>('[data-fotograma]') ?? []);

/* El fotograma visible no cambia de src: se pinta en la capa oculta, se
   espera a decode() y recién entonces se intercambian. Quitar el srcset
   del <Image> y poner otro src en el mismo nodo deja el plato en blanco
   un frame — es el titileo. */
const pintarUrl = async (grupo: HTMLElement | null, url: string, pedido: { n: number }) => {
  if (!grupo || !url) return;
  const capas = capasDe(grupo);
  if (!capas.length) return;
  const visible = capas.find((capa) => capa.classList.contains('esta-activo')) ?? capas[0];
  if (mismaUrl(visible, url)) return;
  const oculta = capas.find((capa) => capa !== visible) ?? visible;
  const este = ++pedido.n;
  oculta.removeAttribute('srcset');
  oculta.removeAttribute('sizes');
  oculta.src = url;
  try {
    await oculta.decode();
  } catch {
    return;
  }
  if (este !== pedido.n) return;
  oculta.classList.add('esta-activo');
  if (oculta !== visible) visible.classList.remove('esta-activo');
};

const montarGiro = (panel: HTMLElement) => {
  const colores = Array.from(panel.querySelectorAll<HTMLButtonElement>('[data-color-control]'));
  const grupos = Array.from(panel.querySelectorAll<HTMLElement>('[data-color]'));
  const giro = panel.querySelector<HTMLElement>('[data-giro]');
  let indiceFotograma = 0;
  let inicioX: number | null = null;
  let ultimoPaso = 0;
  const pedido = { n: 0 };

  const grupoActivo = () => panel.querySelector<HTMLElement>('[data-color].esta-activo');

  const mostrarFotograma = (direccion: number) => {
    const grupo = grupoActivo();
    const urls = urlsDe(grupo);
    if (urls.length < 2) return;
    indiceFotograma = (indiceFotograma + direccion + urls.length) % urls.length;
    /* El primer giro apaga la pista de este plato: ya cumplió. */
    giro?.setAttribute('data-girado', '');
    const url = urls[indiceFotograma];
    if (url) void pintarUrl(grupo, url, pedido);
  };

  const activarColor = (color: string) => {
    const grupo = grupos.find((item) => item.dataset.color === color);
    if (!grupo) return;
    precargarGrupo(grupo);
    colores.forEach((item) => {
      const activo = item.dataset.colorControl === color;
      item.classList.toggle('esta-activo', activo);
      item.setAttribute('aria-pressed', activo ? 'true' : 'false');
    });
    grupos.forEach((item) => {
      const activo = item === grupo;
      item.classList.toggle('esta-activo', activo);
      item.setAttribute('aria-hidden', activo ? 'false' : 'true');
    });
    indiceFotograma = 0;
    const primera = urlsDe(grupo)[0];
    /* El grupo nuevo ya trae el frame 0 en las dos capas. No se reasigna
       el src: eso es lo que hacía titilar al cambiar de color. */
    if (primera) void pintarUrl(grupo, primera, pedido);
  };

  colores.forEach((control) => {
    /* Al pasar por el swatch se llena la caché; el clic ya no espera red. */
    control.addEventListener('pointerenter', () => {
      const color = control.dataset.colorControl;
      precargarGrupo(grupos.find((item) => item.dataset.color === color) ?? null);
    });
    control.addEventListener('click', () => {
      const color = control.dataset.colorControl;
      if (color) activarColor(color);
    });
  });

  giro?.addEventListener('keydown', (evento) => {
    if (evento.key !== 'ArrowLeft' && evento.key !== 'ArrowRight') return;
    evento.preventDefault();
    precargarGrupo(grupoActivo());
    mostrarFotograma(evento.key === 'ArrowLeft' ? -1 : 1);
  });
  giro?.addEventListener('pointerdown', (evento) => {
    precargarGrupo(grupoActivo());
    inicioX = evento.clientX;
    ultimoPaso = 0;
    giro.setPointerCapture(evento.pointerId);
  });
  giro?.addEventListener('pointermove', (evento) => {
    if (inicioX === null) return;
    /* ~10 px por fotograma: 300–360 px recorren una órbita de 30–36 frames.
       El / 34 anterior, pensado para 6 ángulos, se sentía pegajoso. */
    const paso = Math.trunc((evento.clientX - inicioX) / 10);
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

  if (!panel.hidden) precargarGrupo(grupoActivo());
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
/* Crear un ancla durante la carga hace que el navegador salte al panel antes
   de mostrar el hero. La entrada conserva su URL; sólo una elección la cambia. */
seleccionarModelo(inicial ? indiceDe(inicial) : 0, false);
yaPinto = true;

window.addEventListener('hashchange', () => {
  const id = idDesdeHash();
  if (id) irA(id);
});
