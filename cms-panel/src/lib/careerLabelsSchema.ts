import { z } from "zod";

// Rótulos fijos de la plantilla de carrera (/carrera/<slug>) y del detalle de
// noticia. Esas dos rutas NO usan bloques —su maquetación la mandan los datos de
// cada carrera—, así que sus textos viven en src/config/career-labels.json y se
// editan desde el panel. Aquí se validan antes de commitear, igual que el tema o
// los ajustes del sitio: un campo vacío dejaría un hueco en la página publicada.

const texto = (max = 160) => z.string().trim().min(1, "no puede quedar vacío").max(max);

export const careerLabelsSchema = z
  .object({
    _note: z.string().optional(),
    hero: z.object({
      breadcrumbOferta: texto(60),
      primaryCta: texto(40),
      secondaryCta: texto(40),
      fichaTitulo: texto(60),
      proximamente: texto(40),
    }),
    campos: z.object({
      titulo: texto(40),
      nivel: texto(40),
      modalidad: texto(40),
      duracion: texto(40),
      carga: texto(40),
      creditos: texto(40),
      asignaturas: texto(40),
      resolucion: texto(40),
      proximoInicio: texto(40),
      formacionLaboral: texto(60),
    }),
    modalidades: z.object({
      enLinea: texto(60),
      dual: texto(60),
      hibrida: texto(60),
    }),
    tituloOficial: z.object({ eyebrow: texto(60) }),
    pilares: z.object({ eyebrow: texto(60), heading: texto() }),
    egreso: z.object({ eyebrow: texto(60), heading: texto() }),
    malla: z.object({
      eyebrow: texto(60),
      heading: texto(),
      titulacion: texto(40),
      descargaCta: texto(60),
      descargaNota: texto(80),
    }),
    campoOcupacional: z.object({ eyebrow: texto(60), heading: texto(), sectores: texto(40) }),
    aranceles: z.object({
      eyebrow: texto(60),
      heading: texto(),
      verTabla: texto(40),
      porPeriodo: texto(40),
      total: texto(40),
      // Admite HTML simple: lleva el enlace a /becas.
      nota: texto(320),
    }),
    cierre: z.object({
      eyebrow: texto(60),
      headingSufijo: texto(),
      textoEnLinea: texto(240),
      textoDual: texto(240),
      textoHibrida: texto(240),
      statAsignaturas: texto(60),
      statPeriodos: texto(60),
      statPractica: texto(60),
      statPortafolio: texto(60),
      statEnLinea: texto(60),
    }),
    noticia: z.object({ volver: texto(40) }),
  })
  .strict();

export type CareerLabels = z.infer<typeof careerLabelsSchema>;
