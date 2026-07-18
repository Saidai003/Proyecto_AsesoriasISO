# DT-007: Tailwind CSS cargado mediante CDN

- **Fecha de registro:** 18 de julio de 2026
- **Estado:** Abierta
- **Severidad:** Media
- **Tipo:** Despliegue / Frontend
- **Componente afectado:** `frontend/index.html` y pipeline de construcción del frontend

## Contexto

El frontend utiliza clases de utilidad de Tailwind CSS en los componentes JSX. Sin embargo, Tailwind no se encuentra instalado ni versionado en `frontend/package.json`, y no existen archivos locales `tailwind.config.js` ni `postcss.config.js`.

La aplicación carga Tailwind en tiempo de ejecución mediante el siguiente script en `frontend/index.html`:

```html
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
```

El único CSS propio relevante es `src/liquidGlass.css`, utilizado para el efecto visual de la pantalla de inicio de sesión.

## Impacto

- La presentación depende de la disponibilidad de un recurso externo durante la carga de la aplicación.
- La versión de Tailwind no queda fijada ni registrada como dependencia del proyecto.
- `vite build` no genera un artefacto CSS local de Tailwind como parte del frontend.
- La migración posterior puede introducir cambios visuales o incompatibilidades con los plugins utilizados.

Esta condición no impide demostrar los flujos funcionales del prototipo, pero debe resolverse antes de considerar el frontend preparado para un despliegue productivo controlado.

## Plan de corrección

1. Seleccionar y fijar una versión de Tailwind compatible con el frontend existente.
2. Instalar Tailwind como dependencia de desarrollo e integrarlo al pipeline de Vite.
3. Configurar las rutas de detección de clases utilizadas por los componentes JSX.
4. Conservar o reemplazar de forma compatible los plugins `forms` y `container-queries`.
5. Retirar el script CDN desde `frontend/index.html`.
6. Generar el build de producción y verificar que los estilos se incluyan localmente.
7. Ejecutar una revisión visual de login, dashboards, tablas, formularios, Kanban y vistas responsivas.

## Criterios de cierre

- Tailwind aparece como dependencia versionada del frontend.
- El build no requiere `cdn.tailwindcss.com`.
- La aplicación mantiene su comportamiento visual principal sin regresiones críticas.
- Los plugins utilizados cuentan con una configuración compatible y reproducible.