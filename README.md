# Auditoria LUX

Frontend estatico para auditorias de posventa de Autolux, preparado para:

- leer preguntas y datos auxiliares desde Google Sheets
- guardar auditorias en Google Sheets mediante Google Apps Script
- publicarse en GitHub Pages sin backend Node

## Flujo final

1. La app se publica en GitHub Pages.
2. Las preguntas se leen directo desde Google Sheets.
3. Cada auditoria terminada se envia por `POST` a un Web App de Google Apps Script.
4. El dashboard reconstruye el historial leyendo el CSV publicado de la hoja de auditorias.

## Variables necesarias

Configuralas en `.env.local` para desarrollo y tambien como secrets del repo para GitHub Actions:

```env
VITE_AUDIT_APPS_SCRIPT_URL="https://script.google.com/macros/s/TU_SCRIPT/exec"
VITE_AUDIT_HISTORY_CSV_URL="https://docs.google.com/spreadsheets/d/e/TU_CSV/pub?gid=0&single=true&output=csv"
```

## Google Apps Script

El archivo `google-apps-script/Code.gs` incluye el script listo.

Pasos:

1. Crear una hoja de calculo donde se guardaran las auditorias.
2. Abrir `Extensiones > Apps Script`.
3. Pegar el contenido de `google-apps-script/Code.gs`.
4. Implementar como `Aplicacion web`.
5. Elegir acceso `Cualquier usuario`.
6. Copiar la URL `/exec` y usarla en `VITE_AUDIT_APPS_SCRIPT_URL`.
7. Publicar la pestana `Auditorias` como CSV y usar ese enlace en `VITE_AUDIT_HISTORY_CSV_URL`.

## Desarrollo local

```bash
npm install
npm run dev
```

## GitHub Pages

El workflow `.github/workflows/deploy-pages.yml` construye y publica `dist` automaticamente en cada push a `main`.

Antes de usarlo:

1. En GitHub, ir a `Settings > Pages`.
2. En `Source`, elegir `GitHub Actions`.
3. Crear estos secrets del repositorio:
   `VITE_AUDIT_APPS_SCRIPT_URL`
   `VITE_AUDIT_HISTORY_CSV_URL`

## Nota

`server.ts` queda en el repo como referencia historica, pero la publicacion actual ya no depende de Express ni de rutas `/api`.
