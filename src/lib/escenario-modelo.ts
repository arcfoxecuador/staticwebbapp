/* La isla sólo coordina controles y fotogramas. La primera vista ya existe en
   HTML y sigue siendo legible si el navegador bloquea JavaScript. */
const escenarios = document.querySelectorAll<HTMLElement>('[data-slot="escenario-modelo"]');

escenarios.forEach((escenario) => {
  const paneles = Array.from(escenario.querySelectorAll<HTMLElement>('[data-modelo-panel]'));
  const anterior = escenario.querySelector<HTMLButtonElement>('[data-modelo-anterior]');
  const siguiente = escenario.querySelector<HTMLButtonElement>('[data-modelo-siguiente]');
  const nombre = escenario.querySelector<HTMLElement>('[data-modelo-nombre]');
  let modeloActivo = 0;

  const seleccionarModelo = (indice: number) => {
    modeloActivo = (indice + paneles.length) % paneles.length;
    paneles.forEach((panel, i) => {
      panel.hidden = i !== modeloActivo;
    });

    const id = paneles[modeloActivo]?.dataset.modeloPanel;
    if (nombre) nombre.textContent = paneles[modeloActivo]?.getAttribute('aria-label') ?? '';
    const selector = document.querySelector<HTMLSelectElement>('select[name="modelo"]');
    if (selector && id && Array.from(selector.options).some((opcion) => opcion.value === id)) {
      selector.value = id;
      selector.dispatchEvent(new Event('change', { bubbles: true }));
    }
  };

  anterior?.addEventListener('click', () => seleccionarModelo(modeloActivo - 1));
  siguiente?.addEventListener('click', () => seleccionarModelo(modeloActivo + 1));

  paneles.forEach((panel) => {
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
  });

  seleccionarModelo(0);
});
