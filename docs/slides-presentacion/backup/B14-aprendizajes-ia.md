---
marp: true
paginate: true
header: "BACKUP — Preguntas de Comisión"
footer: "Software Web de Gestión ISO | UDP 2026"
---

# Desarrollo con IA — Reflexión

## Analogía histórica

| Transición | Qué dejamos de hacer | Qué tuvimos que aprender |
|-----------|---------------------|--------------------------|
| Assembler → C | Instrucciones máquina | Gestión de memoria |
| C → Java | Gestión manual de memoria | OOP, frameworks |
| Manual → Frameworks | Reinventar routing/auth | Convenciones del framework |
| **Manual → IA generativa** | **Escribir línea por línea** | **Diseñar, segmentar, revisar, validar** |

---

# "Vibe Coding" vs "Vibe Engineering"

## Vibe Coding (lo que se hizo inicialmente)
- Pedir features completas a la IA
- No revisar inmediatamente
- Aceptar resultados de >200 líneas sin auditoría
- **Resultado:** deuda técnica acumulada (ej: 1200 líneas en un componente)

## Vibe Engineering (lo que se adoptó después)
- Diseñar antes de pedir
- Segmentar en tareas de <50 líneas
- Revisar cada resultado inmediatamente
- Intercalar auditorías cada 3-5 tareas
- **Resultado:** código más limpio, problemas detectados temprano

---

# ¿La IA escribió todo el código?

## Realidad

- La IA genera código bajo supervisión del desarrollador
- El desarrollador es responsable de:
  - **Diseño:** qué construir, cómo se relaciona con el resto
  - **Segmentación:** dividir en tareas atómicas
  - **Revisión:** verificar que el código generado es correcto
  - **Validación:** tests, pruebas manuales, auditoría de seguridad
  - **Decisiones:** qué aceptar, qué rechazar, qué rehacer

## Aprendizaje documentado
- 15 documentos en `docs/aprendizajes/` con conceptos fundamentales aprendidos durante el proceso
- No es código generado ciegamente: es código supervisado
