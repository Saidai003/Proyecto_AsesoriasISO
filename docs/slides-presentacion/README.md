# Slides de Presentación — Taller de Titulación

## Estructura

```
slides-presentacion/
├── 00-config.md          ← Configuración Marp global
├── 01-portada.md         ← Slide de portada
├── 02-agenda.md          ← Agenda de la presentación
├── 03-contexto-empresa.md ← Asesorías ISO RCR SpA + Sprint ISO
├── 04-problema.md        ← Problema y alternativas existentes
├── 05-objetivos.md       ← Objetivo general y específicos
├── 06-arquitectura.md    ← Arquitectura, C4, ADRs
├── 07-modelo-datos.md    ← Modelo de datos y multi-tenancy
├── 08-funcionalidades-core.md ← Auth, GAP, NC, Acciones
├── 09-funcionalidades-evidencias.md ← Evidencias, Drive, Chat, Notif
├── 10-dashboard.md       ← Dashboard analítico con radar
├── 11-demo.md            ← Marcador para demo en vivo
├── 12-validacion.md      ← Pruebas y plan de validación
├── 13-deuda-tecnica.md   ← Deuda técnica y lecciones
├── 14-resultados.md      ← Resultados y comparación
├── 15-conclusion.md      ← Conclusiones, limitaciones, futuro
└── backup/               ← Slides de reserva para preguntas
    ├── B01-seguridad-detalle.md
    ├── B02-base-datos-detalle.md
    ├── B03-websocket-detalle.md
    ├── B04-google-drive-detalle.md
    ├── B05-multitenancy-detalle.md
    ├── B06-testing-detalle.md
    ├── B07-docker-despliegue.md
    ├── B08-frontend-detalle.md
    ├── B09-iso-9001-contexto.md
    ├── B10-metodologia-trabajo.md
    ├── B11-escalabilidad-futuro.md
    ├── B12-acciones-correctivas-detalle.md
    ├── B13-terminologia-cambio.md
    ├── B14-aprendizajes-ia.md
    └── B15-preguntas-frecuentes.md
```

## Cómo usar

### Opción 1: Marp for VS Code (recomendada)
1. Instalar extensión "Marp for VS Code"
2. Abrir cualquier archivo .md → preview aparece automáticamente
3. Exportar: `Ctrl+Shift+P` → "Marp: Export Slide Deck" → PDF o PPTX

### Opción 2: Marp CLI
```bash
npx @marp-team/marp-cli 01-portada.md --pdf
```

### Opción 3: Concatenar todo en un archivo
Para una presentación continua, copiar el contenido de cada archivo en orden en un solo .md separando con `---`.

## Notas

- Cada archivo es auto-contenido con su header Marp
- Los separadores `---` dentro de cada archivo separan slides
- Las secciones de backup se usan solo si la comisión pregunta sobre esos temas
- Las imágenes/capturas deben insertarse reemplazando los comentarios `<!-- Insertar... -->`
- **Total estimado:** ~28-30 slides principales + 30 slides de backup
