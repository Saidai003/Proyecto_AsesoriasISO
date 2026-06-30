# Cómo Pedir Explicaciones de HU/RF a la IA

> **Fecha:** 29/06/2026  
> **Contexto:** Definir un protocolo de comunicación eficiente para la revisión de criterios de aceptación

---

## El problema

Revisar HU/RFs leyendo código directamente causa dispersión: te desvías explorando partes del código que te llaman la atención y nunca terminas de marcar como "Revisado".

## La solución

Pedirle a la IA que explique cada HU/RF siguiendo un formato estructurado. Tú solo lees la explicación, entiendes la lógica de negocio, y marcas como Revisado.

---

## Cómo pedir

Simplemente dí el ID del criterio y "Procede". Ejemplos:

- "RF-AC-01-CA-002 — Procede"
- "Siguiente" (si estamos en secuencia)
- "Explícame RF7-CA-001"

---

## Qué vas a recibir

1. **Qué hace** — 1-2 oraciones funcionales
2. **Lógica de negocio** — frontend (componente, función) + backend (controller, validaciones, tablas)
3. **Resumen para comisión** — lo que dirías si te preguntan
4. **⚠️ Alertas** (solo si hay problemas) — inconsistencias de seguridad, bugs potenciales, cosas fuera del patrón

---

## Qué NO vas a recibir (a menos que preguntes)

- Re-explicación de cómo funciona React Router / Express Router
- Re-explicación de fetchWithAuth, requireAuth, JWT
- Detalles de sintaxis JavaScript que no afectan la lógica
- Exploraciones tangenciales de código

---

## Acuerdos vigentes

- La IA revisa la fontanería internamente y solo te notifica si algo está mal
- Si la IA detecta un bug o inconsistencia de seguridad, te lo dice al final y tú decides si corregir ahora o dejarlo para después
- Los códigos se pueden simplificar en la explicación para enfocarse en la lógica
- Si algo ya está documentado en otro aprendizaje, se referencia en vez de re-explicar

---

## Para activar este modo en un nuevo chat

Decirle a la IA: "Revisa el steering `explicacion-hu-rf` y ayúdame a revisar HUs/RFs"

O simplemente dar el ID de un criterio y esperar la explicación — si la IA tiene acceso al steering, lo usará automáticamente.
