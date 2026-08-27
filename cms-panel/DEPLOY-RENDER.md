# Desplegar el panel en Render (ARCFOX)

El sitio público sigue en Vercel (`arcfox.com.ec`). Este servicio es **solo**
el panel (`cms-panel/`). No copies valores de IIDEA: `SITE_DIR` va **vacío**
(el sitio es la raíz del repo, no `astro-web`).

El Blueprint está en `render.yaml` (raíz del repo). Render no se puede
«enchufar» desde aquí: hace falta tu cuenta y los secretos.

---

## Qué pide el kit y qué no

El kit (`reference/cms.md`) ya está hecho en este repo: panel copiado,
`client.config.json`, `brand.json`, Entradas → `src/content/articulos/`,
`ORIGEN` en `'colecciones'`. Eso **no** incluye Render.

| Para | Hace falta | No hace falta |
| --- | --- | --- |
| Día uno en local | `.env` + `npm --prefix cms-panel install` + `run dev` | Render, Microsoft, Anthropic |
| Que el editor commitee | `GITHUB_TOKEN` | — |
| Login en producción | Microsoft 365 (Entra). El kit no admite bypass | — |
| Asistente IA | `ANTHROPIC_API_KEY` | El resto del panel corre sin ella |
| Subdominio `cms.arcfox.com.ec` | DNS + `PANEL_BASE_URL` | Se puede arrancar antes en `*.onrender.com` |

Páginas, Carreras, Apariencia y Ajustes siguen ocultas. No las enciendas
para «completar el kit»: el sitio no pinta esos archivos.

---

## 1. Blueprint (la vía directa)

1. Sube `render.yaml` a `main` (si aún no está en GitHub).
2. Entra a **https://dashboard.render.com** → **New + → Blueprint**.
3. Autoriza GitHub y elige el repo **Retr1to/ARCFOX**.
4. **Apply** sin pegar secretos. `SESSION_SECRET` lo genera Render.
   `SITE_DIR` queda vacío. `GITHUB_REPO=ARCFOX`.
5. Build ~2–4 min. Health check: `/healthz` → 200. El login muestra la
   pantalla, pero Microsoft responde 503 hasta que existan las claves.

Cuando las tengas, en el servicio → **Environment** (no hace falta
redeploy del Blueprint):

| Variable | Qué poner |
| --- | --- |
| `PANEL_BASE_URL` | `https://arcfox-cms-panel.onrender.com` (la URL de Render). Luego `https://cms.arcfox.com.ec` si hay subdominio. |
| `GITHUB_TOKEN` | Fine-grained PAT: Contents + Pull requests, solo este repo |
| `MICROSOFT_CLIENT_ID` / `SECRET` / `TENANT_ID` | App Web en Entra. Redirect: `{PANEL_BASE_URL}/auth/microsoft/callback` |
| `ALLOWED_EMAIL_DOMAIN` | `arcfox.com.ec` |
| `ANTHROPIC_API_KEY` | Solo si el asistente va a hablar |

---

## 2. A mano (si no usas Blueprint)

**New + → Web Service** → repo ARCFOX:

| Campo | Valor |
| --- | --- |
| Name | `arcfox-cms-panel` |
| Root Directory | `cms-panel` |
| Runtime | Node |
| Build | `npm ci && npm run build` |
| Start | `npm start` |
| Instance | Starter |

Mismas variables que arriba. Render inyecta `PORT`; no pongas `4322` aquí
(ese puerto es solo local, junto al sitio en `4321`).

---

## 3. Subdominio (opcional, después)

1. Render → Settings → Custom Domains → `cms.arcfox.com.ec`.
2. DNS: CNAME `cms` → `arcfox-cms-panel.onrender.com`, **DNS only**.
3. Cambia `PANEL_BASE_URL` a `https://cms.arcfox.com.ec` y el Redirect URI
   de Entra al mismo host + `/auth/microsoft/callback`.

---

## Lo que no copies de la guía vieja

- `SITE_DIR=astro-web` — aquí el sitio es la raíz.
- `cms.iidea.edu.ec`, Amplify, App Runner.
- Un bypass de login «para probar producción».
