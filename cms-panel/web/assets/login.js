// Muestra el aviso de "cuenta no autorizada" cuando el callback de Microsoft
// vuelve con ?error=1. Vive en un archivo aparte (y no como <script> inline)
// para que la CSP pueda ser `script-src 'self'`, sin 'unsafe-inline'.
if (new URLSearchParams(location.search).get("error")) {
  document.getElementById("err").hidden = false;
}
