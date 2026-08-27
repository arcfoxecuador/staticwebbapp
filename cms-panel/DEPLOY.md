# Despliegue del panel de agentes IIDEA

El **sitio Astro se queda en Amplify** (no se toca). El **panel** se despliega
aparte como un servicio Node siempre encendido. Esta guía cubre **AWS App Runner**
(recomendado) y, al final, el reuso del mismo `Dockerfile` en Lightsail/EC2.

Arquitectura final:

```
iidea.edu.ec         → Amplify (sitio Astro estático)   [ya existe]
cms.iidea.edu.ec     → App Runner (este panel)           [a desplegar]
        │ commit + PR
        ▼
GitHub (retr1to/iidea-paginaweb) → Amplify reconstruye el sitio al hacer merge
```

---

## 0. Requisitos previos

- Cuenta AWS (la misma de Amplify).
- Repo en GitHub: `retr1to/iidea-paginaweb`.
- Acceso a Microsoft Entra (para el login con Microsoft 365).
- API key de Anthropic.

---

## 1. Variables de entorno (todas se cargan en App Runner)

| Variable | Valor | De dónde sale |
|---|---|---|
| `PORT` | `8080` | Fijo (App Runner) |
| `PANEL_BASE_URL` | `https://cms.iidea.edu.ec` | El subdominio final |
| `ANTHROPIC_API_KEY` | `sk-ant-…` | console.anthropic.com |
| `MODEL_BLOG_AGENT` | `claude-opus-4-8` | (opcional, ya por defecto) |
| `MODEL_DESIGN_AGENT` | `claude-opus-4-8` | (opcional) |
| `MODEL_ROUTER` | `claude-haiku-4-5` | (opcional) |
| `GITHUB_TOKEN` | token con permisos del paso 2 | GitHub |
| `GITHUB_OWNER` | `retr1to` | — |
| `GITHUB_REPO` | `iidea-paginaweb` | — |
| `GITHUB_BASE_BRANCH` | `main` | rama de producción |
| `SITE_DIR` | `astro-web` | carpeta del sitio en el repo |
| `MICROSOFT_CLIENT_ID` | de la app en Entra | paso 3 |
| `MICROSOFT_CLIENT_SECRET` | de la app en Entra | paso 3 |
| `MICROSOFT_TENANT_ID` | Directory (tenant) ID de IIDEA (o `organizations`) | paso 3 |
| `ALLOWED_EMAIL_DOMAIN` | `iidea.edu.ec` | — |
| `ALLOWED_EMAILS` | *(vacío)* o lista coma-separada | opcional, restringe más |
| `SESSION_SECRET` | cadena aleatoria larga | genera con `openssl rand -hex 32` |
| `IMAGE_PROVIDER` | `none` o `openai` | opcional |
| `OPENAI_API_KEY` | `sk-…` | solo si usas imágenes IA |

> Marca `ANTHROPIC_API_KEY`, `GITHUB_TOKEN`, `MICROSOFT_CLIENT_SECRET`, `SESSION_SECRET`
> y `OPENAI_API_KEY` como **secrets** en App Runner (no como texto plano).

---

## 2. Token de GitHub

Crea un **fine-grained Personal Access Token** (o una GitHub App) con acceso
**solo** al repo `iidea-paginaweb` y permisos:

- **Contents:** Read and write  (crear ramas y commitear archivos)
- **Pull requests:** Read and write  (abrir los PR de revisión)

Cópialo en `GITHUB_TOKEN`.

---

## 3. Microsoft 365 / Entra ID (login)

1. Microsoft Entra → **App registrations → New registration** (tipo **Web**).
2. **Redirect URIs:**
   - `https://cms.iidea.edu.ec/auth/microsoft/callback`
   - (para pruebas locales) `http://localhost:4321/auth/microsoft/callback`
3. Copia el **Application (client) ID** a `MICROSOFT_CLIENT_ID`, crea un
   **client secret** (Certificates & secrets) para `MICROSOFT_CLIENT_SECRET`, y
   el **Directory (tenant) ID** para `MICROSOFT_TENANT_ID` (o usa `organizations`).

> El dominio se fuerza con `ALLOWED_EMAIL_DOMAIN=iidea.edu.ec`: cualquier cuenta
> fuera de ese dominio es rechazada en el login (o restringe a `ALLOWED_EMAILS`).

---

## 4. Desplegar en App Runner (desde GitHub + Dockerfile)

App Runner construye con el `Dockerfile` del repo; no necesitas ECR ni Docker local.

1. **App Runner → Create service → Source: Source code repository.**
2. **Connect to GitHub** → autoriza y elige `retr1to/iidea-paginaweb`, rama `main`.
3. **Deployment trigger:** Automatic (se redesplegará al hacer push).
4. **Source directory:** `cms-panel`.
5. **Build settings → Configuration:** *Use a Dockerfile* (App Runner detecta
   `cms-panel/Dockerfile`).
6. **Service settings:**
   - **Port:** `8080`
   - **CPU/Memoria:** `0.25 vCPU` / `0.5 GB` (suficiente para uso interno).
   - **Environment variables / secrets:** carga todas las del paso 1.
   - **Health check:** HTTP, path `/healthz` (responde 200 JSON sin autenticación).
7. **Create & deploy.** Al terminar te da una URL `https://xxxx.awsapprunner.com`.
   Pruébala: deberías ver la pantalla de login.

---

## 5. Subdominio `cms.iidea.edu.ec`

1. En el servicio de App Runner → **Custom domains → Add domain** →
   `cms.iidea.edu.ec`.
2. App Runner te dará **registros CNAME** (uno para el dominio y otros de
   validación de certificado). Créalos donde administres el DNS de `iidea.edu.ec`.
3. Espera la validación (minutos a ~1 h). App Runner emite el certificado SSL solo.
4. Cuando el dominio quede **Active**, confirma que:
   - `PANEL_BASE_URL=https://cms.iidea.edu.ec`
   - El redirect URI de Microsoft (paso 3) usa ese mismo dominio.

---

## 6. Prueba end-to-end

1. Entra a `https://cms.iidea.edu.ec` → login con tu cuenta `@iidea.edu.ec`.
2. Modo **Diseño** → "pon la web navideña con nieve" → debe abrir un PR.
3. Revisa el **preview de Vercel/Amplify** del PR y haz merge para publicar.
4. Modo **Blog** → "escribe una nota sobre la próxima fecha de inicio" → PR.

---

## 7. Roles: administradores y editores

El panel distingue dos roles. La lista de admins se define en la variable
`ADMIN_EMAILS` (correos coma-separados). **Si se deja vacía, todos los usuarios
autorizados son admin** (útil para un instituto con un solo editor).

| Acción | Editor | Admin |
| --- | :---: | :---: |
| Editar páginas, carreras y blog (incl. SEO por página) | ✅ | ✅ |
| Usar el Asistente IA | ✅ | ✅ |
| Cambiar apariencia / tema del sitio | — | ✅ |
| Gestionar categorías del blog | — | ✅ |
| Borrar medios permanentemente | — | ✅ |
| Promover de staging a producción | — | ✅ |

La restricción es **del lado del servidor** (middleware `requireAdmin`): aunque
un editor manipule el navegador, esas rutas responden `403`. El frontend además
oculta esas secciones para no confundir.

```bash
ADMIN_EMAILS=direccion@iidea.edu.ec,marketing@iidea.edu.ec
```

## 8. Modo staging / vista previa (opcional)

Por defecto el panel **publica directo a producción**: `GITHUB_BASE_BRANCH` y
`GITHUB_PROD_BRANCH` son ambas `main`, así que cada cambio del editor o del
agente se commitea a `main` y Amplify/Vercel reconstruye el sitio. Simple y
suficiente para un flujo de una sola persona.

Para revisar antes de publicar, actívalo así:

1. Crea una rama `stage` en el repo del sitio y un **deploy que la siga**
   (en Vercel/Amplify, un entorno apuntando a la rama `stage`). Anota su URL.
2. En las variables del panel:
   ```bash
   GITHUB_BASE_BRANCH=stage          # editor y agentes commitean aquí
   GITHUB_PROD_BRANCH=main           # producción
   STAGE_URL=https://stage.iidea.edu.ec   # URL del deploy de staging
   ```
3. Reinicia el panel. Ahora:
   - Los cambios se publican a **staging** (el botón "Vista previa" y los
     enlaces "ver resultado" apuntan a `STAGE_URL`).
   - Aparece el botón **"Publicar a producción"** en el Escritorio (solo para
     **admins**). Al pulsarlo, el panel hace fast-forward de `stage` → `main`
     (`POST /api/promote`) y producción se reconstruye.

Si `STAGE_URL` no se define, cae a `SITE_URL`. La barrera de validación (Zod en
el build de Astro) actúa igual en ambas ramas: contenido inválido nunca llega a
publicarse, ni en staging ni en producción.

---

## Alternativa: Lightsail o EC2 (mismo Dockerfile)

El `Dockerfile` sirve igual. En una instancia con Docker:

```bash
# Construir y correr
docker build -t iidea-cms ./cms-panel
docker run -d --name iidea-cms --env-file cms-panel/.env -p 8080:8080 iidea-cms
```

Para HTTPS sin configurar certificados a mano, pon **Caddy** delante (saca el SSL
de Let's Encrypt automáticamente) con un `Caddyfile`:

```
cms.iidea.edu.ec {
    reverse_proxy localhost:8080
}
```

Apunta el DNS `cms.iidea.edu.ec` (registro A) a la IP pública de la instancia.

---

## Costos (referencia)

- App Runner 0.25 vCPU / 0.5 GB, uso interno: **~$5–15/mes**.
- Lightsail 1 GB: **$7/mes fijo**.
- IA (Claude) según volumen: **~$2–18/mes**.
