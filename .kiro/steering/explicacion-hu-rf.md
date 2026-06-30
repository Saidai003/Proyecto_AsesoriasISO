---
inclusion: manual
---

# Patrón de Explicación de HU/RF para Revisión

> Este documento guía cómo explicar historias de usuario y requisitos funcionales al desarrollador durante su revisión de la plataforma.

## Contexto

El desarrollador está revisando cada HU/RF de su hoja de cálculo para marcarlos como "Revisado". Necesita entender rápidamente qué hace cada uno y dónde vive en el código, sin perderse en exploraciones tangenciales.

## Formato de explicación

Cuando el usuario pida revisar un RF/HU, seguir esta estructura:

### 1. Encabezado
- ID del criterio (ej: RF-AC-01-CA-002)
- Nombre corto (ej: "Editar acción correctiva")

### 2. ¿Qué hace? (1-2 oraciones)
Descripción funcional directa de qué permite hacer esta feature al usuario.

### 3. ¿Es importante?
Si considero que no es relevante para la presentación o que es trivial, decirlo explícitamente para que el usuario pueda decidir si profundizar.

### 4. Lógica de negocio (el foco principal)
- **Frontend**: qué componente, qué función, qué payload se envía. Referenciar archivo clickeable.
- **Backend**: qué valida el controller, qué reglas de negocio aplica, qué tablas toca. Referenciar archivo clickeable.
- Simplificar el código en la explicación (no copiar verbatim si es largo), enfocándose en la lógica, no en la sintaxis.

### 5. Resumen para marcar como revisado (2-3 oraciones)
Frase que el usuario podría usar si le preguntan "¿qué hace esto?" en la comisión.

### 6. ⚠️ Observaciones de fontanería (solo si hay problemas)
Si durante la revisión detecto algo inconsistente, inseguro, o que se sale del patrón documentado en `aprendizajes/13-patron-base-request-response.md`, reportarlo aquí. Si todo está normal, NO incluir esta sección.

## Reglas

- **NO** re-explicar la fontanería (React Router, Express Router, fetchWithAuth, requireAuth) a menos que haya algo anormal.
- **SÍ** revisar internamente que la fontanería siga el patrón estándar antes de omitirla.
- **SÍ** referenciar archivos como links clickeables: `[archivo](ruta)`.
- **SÍ** simplificar código para la explicación, enfocando en la lógica de negocio.
- **NO** desviar al usuario con exploración de código tangencial.
- **SÍ** responder preguntas puntuales del usuario sobre detalles sin convertirlas en exploraciones largas.
- Si el usuario pregunta por algo que ya está documentado en `/aprendizajes/`, referirlo al documento en vez de re-explicar.

## Información de la plataforma (contexto constante)

- Arquitectura: SPA React + API REST Express + MySQL (ADR-001)
- Auth: JWT 30min + Refresh token en DB (ADR-006)
- Roles: Admin, Evaluador, Responsable SGC (ADR-007)
- IDOR: toda operación valida workspace del usuario via JOIN
- Historial: tablas _HIST para trazabilidad
- Notificaciones: INSERT en NOTIFICACIONES tras cambios relevantes
- Frontend state: useState + fetchWithAuth, sin state manager global
- Patrón completo documentado en: `aprendizajes/13-patron-base-request-response.md`
- Routers explicados en: `aprendizajes/12-react-router-vs-express-router.md`
