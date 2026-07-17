# Estados y Flujos del Sistema

Este documento describe en detalle los 5 estados editables de la plataforma ISO, sus reglas de transición, permisos por rol, efectos secundarios y puntos de entrada en el código.

**Roles del sistema:** `Admin`, `Evaluador`, `Responsable SGC`.
> Nota: "Admin" siempre tiene acceso implícito a todos los endpoints (ver `requireRoles()` en `middleware/auth.js` línea 30).

---

## 1. Aprobación de Evidencia

**Campo DB:** `estado_validacion_archivo` — tabla `EVIDENCIAS`  
**Tipo:** `ENUM('Pendiente','Aceptado','Rechazado')` — `DEFAULT 'Pendiente'`

### Valores y significado
| Estado | Descripción |
|---|---|
| `Pendiente` | Estado inicial al subir un archivo. Espera revisión del Evaluador. |
| `Aceptado` | El Evaluador validó que la evidencia es suficiente y correcta. |
| `Rechazado` | El Evaluador determinó que la evidencia no es válida o insuficiente. |

### Reglas de transición
- Al crear una evidencia (`POST /api/evidences`), el estado se establece automáticamente en `Pendiente` (por el DEFAULT de la columna).
- Un Evaluador puede cambiar de `Pendiente` → `Aceptado` o `Pendiente` → `Rechazado`.
- También puede pasar de `Aceptado` ↔ `Rechazado` directamente (el backend no impone restricción de transición entre estos estados, solo restricción de rol).
- Cuando se sube una nueva versión del archivo (campo `fileData` en el body), el estado **no se reinicia automáticamente** a `Pendiente`; el estado solo cambia si el payload incluye explícitamente `estado_validacion_archivo`.

### Permisos por rol (implementado)
| Acción | Roles permitidos | Código fuente |
|---|---|---|
| Subir evidencia | Cualquier usuario autenticado | `POST /api/evidences` — `requireAuth` (sin `requireRoles`) |
| Descargar evidencia | `Admin`, `Evaluador`, `Responsable SGC`, o el usuario que la subió (`usuario_carga_id`) | `evidenceController.js:106` |
| Cambiar `estado_validacion_archivo` | Solo `Admin` y `Evaluador` | `checkStatusChangePermission()` — `evidenceController.js:196-200` |
| Editar otros campos (nombre, comentario) | `Admin`, `Evaluador` (solo el campo de estado), o el usuario que subió la evidencia | `checkGeneralPermission()` — `evidenceController.js:202-208` |
| El Evaluador solo puede enviar `estado_validacion_archivo` en el payload | `checkEvaluatorRestrictions()` — `evidenceController.js:188-194` |
| Eliminar evidencia | `Admin` o el usuario que la subió | `evidenceController.js:544` |

### Efectos secundarios
- **Historial (`EVIDENCIAS_LOG`):** Cada cambio de aprobación inserta un registro con `tipo_accion = 'APPROVAL'` y un `detalle` que incluye el cambio textual (ej. `"Aprobación: Pendiente → Aceptado"`). Ver `evidenceController.js:523-524`.
- **Otros logs:** `UPLOAD`, `DELETE`, `UPDATE`, `REPLACE` — según la acción realizada.
- **Notificaciones:** Actualmente **NO** se crean notificaciones automáticas al aprobar/rechazar evidencia en el código existente. (Solo se registra en el log).

### Puntos de entrada
| Capa | Ruta / Componente |
|---|---|
| **API** | `PATCH /api/evidences/:id` — body: `{ estado_validacion_archivo: "Aceptado" }` |
| **Ruta backend** | `routes/evidences.js:10` → `evidenceController.updateEvidence` |
| **Frontend** | Componente en la vista de detalle de requisito (modal de evidencias). Historial: `EvidenceHistoryModal.jsx` |

---

## 2. Flujo de No Conformidad (NC) / Brecha

**Campo DB:** `estado_flujo` — tabla `AUDITORIA_NC`  
**Tipo:** `VARCHAR(50)` (no es ENUM, los valores se validan en el controlador)

### Valores y significado
| Estado | Descripción |
|---|---|
| `Abierta` | Estado inicial al crear una NC. El hallazgo fue detectado. |
| `Análisis` | Se está realizando análisis de causa raíz y proponiendo acciones correctivas. |
| `Ejecución` | Las acciones correctivas se están implementando. |
| `Verificación` | Las acciones se completaron. El Evaluador debe verificar su eficacia. **Requiere `fecha_verificacion_eficacia`** (fecha futura obligatoria). |
| `Cerrada` | La NC fue resuelta satisfactoriamente tras verificación. |

### Reglas de transición (según `ncController.js:108-145`)

**Responsable SGC** puede mover entre:
- `Abierta` ↔ `Análisis` ↔ `Ejecución` (solo estos tres estados)
- Si intenta cambiar a `Verificación` o `Cerrada`: error `invalid_target_state`.

**Evaluador** puede mover entre:
- `Abierta`, `Verificación`, `Cerrada`
- Si intenta cambiar a `Análisis` o `Ejecución`: error `invalid_target_state`.

**Regla especial de Verificación:**
- Al cambiar a `Verificación`, se **requiere** el campo `fecha_verificacion_eficacia` en el body.
- Esta fecha **debe ser futura** (`ts > Date.now()`), de lo contrario devuelve `fecha_verificacion_must_be_future`.
- Se programa una **notificación planificada** (`SCHEDULED_NOTIFICATIONS`) para el evaluador de la NC en esa fecha futura.

**Nota sobre valor inicial:** Al crear una NC (`createNC`), `estado_flujo` se establece en `'Abierta'` y `estado_validacion` en `'Parcial'` (ver `ncController.js:29`).

### Permisos por rol (implementado)
| Acción | Roles permitidos | Código fuente |
|---|---|---|
| Crear NC | `Evaluador` (+ Admin implícito) | `POST /api/nc` — `requireRoles('Evaluador')` — `routes/nc.js:8` |
| Eliminar NC | `Evaluador` (+ Admin implícito) | `DELETE /api/nc/:id` — `requireRoles('Evaluador')` — `routes/nc.js:10` |
| Cambiar `estado_flujo` | Cualquier autenticado (el controlador valida internamente por rol) | `PATCH /api/nc/:id` — `ncController.updateNC:108-145` |
| Leer NC / historial | Cualquier autenticado del workspace | `GET /api/nc/:id`, `GET /api/nc/:id/hist` |

### Efectos secundarios
- **Historial (`AUDITORIA_NC_HIST`):** Cada actualización (flujo o validación) inserta un snapshot con: `nc_id`, `estado_flujo`, `estado_validacion`, `fecha_verificacion_eficacia`, `comentario`, `ultima_edicion_por`, `fecha_snapshot`. Ver `ncController.js:159-166`.
- **Notificaciones (`NOTIFICACIONES`):** Se notifica a **todos los responsables asignados** (tabla pivot `AUDITORIA_NC_RESPONSABLES`) con tipo `NC_UPDATED` y un link `/nc/:id`. Ver `ncController.js:169-175`.
- **Notificación programada:** Al entrar en `Verificación`, se inserta un registro en `SCHEDULED_NOTIFICATIONS` para el evaluador de la NC. Ver `ncController.js:134-141`.
- **Protección IDOR:** Todas las queries validan `er.workspace_id` via JOIN.

### Puntos de entrada
| Capa | Ruta / Componente |
|---|---|
| **API** | `PATCH /api/nc/:id` — body: `{ estado_flujo: "Análisis" }` o `{ estado_flujo: "Verificación", fecha_verificacion_eficacia: "2025-02-01T10:00:00Z" }` |
| **Ruta backend** | `routes/nc.js:20` → `ncController.updateNC` |
| **Frontend** | Vista de detalle de NC (hallazgo). No existe componente Kanban para flujo de NC. |

---

## 3. Aceptación de No Conformidad

**Campo DB:** `estado_validacion` — tabla `AUDITORIA_NC`  
**Tipo:** `ENUM('Acepto','Parcial','No Acepto')`

### Valores y significado
| Estado | Descripción |
|---|---|
| `Acepto` | El evaluado/responsable reconoce el hallazgo completamente. |
| `Parcial` | Se reconoce parcialmente; hay discrepancias que requieren discusión (chat/comentarios). **Valor inicial** al crear NC. |
| `No Acepto` | El evaluado rechaza el hallazgo. Requiere mediación y justificación. |

### Reglas de transición (según `ncController.js:95-97`)
- El campo `estado_validacion` se actualiza **sin restricción de transición** entre los tres valores.
- Se puede pasar libremente entre cualquier combinación: `Parcial` → `Acepto`, `No Acepto` → `Parcial`, etc.
- **No hay validación de rol** específica para cambiar `estado_validacion` en el controller (cualquier usuario autenticado del workspace puede cambiarlo).
- El estado inicial al crear la NC es `Parcial` (no hay un estado "sin definir").

### Permisos por rol (implementado)
| Acción | Roles permitidos | Código fuente |
|---|---|---|
| Cambiar `estado_validacion` | Cualquier usuario autenticado del workspace | `PATCH /api/nc/:id` — `ncController.updateNC:95-97` (sin chequeo de rol para este campo) |
| Editar `comentario_nc` | Solo `Evaluador` y `Admin` | `ncController.updateNC:100-105` |

### Efectos secundarios
- **Historial (`AUDITORIA_NC_HIST`):** Se registra junto con cualquier cambio de la NC (comparte el mismo snapshot). El campo `estado_validacion` se guarda en cada snapshot del historial.
- **Notificaciones (`NOTIFICACIONES`):** Se notifica a todos los responsables asignados con tipo `NC_UPDATED`. El mensaje incluye el nuevo `estado_validacion` si fue cambiado.

### Puntos de entrada
| Capa | Ruta / Componente |
|---|---|
| **API** | `PATCH /api/nc/:id` — body: `{ estado_validacion: "Acepto" }` |
| **Ruta backend** | `routes/nc.js:20` → `ncController.updateNC` (mismo endpoint que estado_flujo) |
| **Frontend** | Vista de detalle de NC |

> **Importante:** `estado_flujo` y `estado_validacion` se actualizan por el **mismo endpoint** (`PATCH /api/nc/:id`). Se pueden enviar ambos en un solo request o por separado.

---

## 4. Avance de Acción Correctiva

**Campo DB:** `estado_accion` — tabla `ACCIONES_CORRECTIVAS`  
**Tipo:** `ENUM('Pendiente','En_Progreso','Eficaz','No_Eficaz')`

### Valores y significado
| Estado | Descripción |
|---|---|
| `Pendiente` | Estado inicial. La acción fue planificada pero no ha comenzado. |
| `En_Progreso` | El responsable comenzó la ejecución de la acción. |
| `Eficaz` | La acción fue implementada y verificada como efectiva. Puede contribuir al cierre de la NC. |
| `No_Eficaz` | La acción no resolvió la causa raíz. Puede requerir nuevas acciones o una nueva NC (si `requiere_nueva_nc = 1`). |

### Reglas de transición (según `accionesController.js:78-106`)
- Se valida que el nuevo estado esté en la lista `ALLOWED = ['Pendiente','En_Progreso','Eficaz','No_Eficaz']` (línea 4).
- **No hay restricción de transición entre estados:** se puede pasar de cualquier estado a cualquier otro directamente (ej: `Eficaz` → `Pendiente`).
- Al cambiar estado, se actualiza automáticamente `fecha_accion = NOW()`.
- Campos editables adicionales junto al estado: `accion`, `contenido_comentario`, `acciones_futuras_propuestas`, `requiere_nueva_nc`.

### Permisos por rol (implementado)
| Acción | Roles permitidos | Código fuente |
|---|---|---|
| Crear acción correctiva | Cualquier autenticado | `POST /api/nc/:id/acciones` — `requireAuth` (sin `requireRoles`) — `routes/nc.js:23` |
| Actualizar estado/campos | `Responsable SGC` y `Admin` | `PATCH /api/acciones/:id` — `requireRoles('Responsable SGC', 'Admin')` — `routes/acciones.js:7` |
| Eliminar acción (y descendientes) | `Responsable SGC` y `Admin` | `DELETE /api/acciones/:id` — `requireRoles('Responsable SGC', 'Admin')` — `routes/acciones.js:10` |
| Ver historial | Cualquier autenticado | `GET /api/acciones/hist` — `requireAuth` — `routes/acciones.js:13` |

> **Nota importante:** En el código actual, el Evaluador **NO** tiene permiso de ruta para actualizar acciones correctivas. Solo `Responsable SGC` y `Admin` pueden hacerlo a nivel de middleware.

### Efectos secundarios
- **Historial (`ACCIONES_CORRECTIVAS_HIST`):**
  - Al **crear** una acción: se inserta un registro con `estado_anterior = null`, `estado_nuevo = <estado inicial>` (línea 272).
  - Al **cambiar estado**: se inserta con `estado_anterior` y `estado_nuevo` + comentario opcional (línea 92-96).
  - Al **editar campos** (sin cambio de estado): se inserta un registro separado con `estado_anterior = null`, `estado_nuevo = null` y un comentario descriptivo tipo `"Campos modificados: accion: 'X' → 'Y'"` (líneas 118-126).
- **Notificaciones (`NOTIFICACIONES`):** Al cambiar de estado, se notifica a todos los responsables de la NC padre (`AUDITORIA_NC_RESPONSABLES`) con tipo `ACCION_UPDATED` y link `/nc/:ncId` (líneas 98-105).
- **Notificaciones al crear:** Al crear una acción, se notifica a los responsables de la NC Y al evaluador de la NC con tipo `ACCION_NC` (líneas 275-288).
- **Eliminación en cascada:** Al eliminar una acción, se buscan recursivamente todas las acciones hijas (`accion_previa_id`) y se eliminan en orden inverso (hijos antes que padres) — `accionesController.js:199-217`.
- **Campo `requiere_nueva_nc`:** Se almacena como flag (0/1) pero **NO hay lógica automática** en el backend que cree una nueva NC. Es un flag informativo para el usuario.

### Puntos de entrada
| Capa | Ruta / Componente |
|---|---|
| **API crear** | `POST /api/nc/:id/acciones` — body: `{ accion: "...", estado_accion: "Pendiente" }` |
| **API actualizar** | `PATCH /api/acciones/:id` — body: `{ estado_accion: "En_Progreso", comentario: "..." }` |
| **API historial** | `GET /api/acciones/hist?nc=1&estado=Eficaz&page=1&pageSize=50` |
| **Ruta backend** | `routes/acciones.js` y `routes/nc.js` |
| **Frontend** | `ActionKanbanBoard.jsx` (tablero Kanban con drag-and-drop), `EditableEstado.jsx` (dropdown inline), `CreateRootAction.jsx` |

---

## 5. Estado de Requisito (Cumplimiento)

**Campo DB:** `estado_cumplimiento` — tabla `EVALUACION_REQUISITO`  
**Tipo:** `ENUM('Cumple','Parcial','No cumple','NA')`

### Valores y significado
| Estado | Descripción |
|---|---|
| `Cumple` | El requisito se cumple completamente. Evidencia suficiente. |
| `Parcial` | Cumplimiento parcial. Puede haber una brecha menor. |
| `No cumple` | No cumple el requisito. Se espera una NC asociada. |
| `NA` | No aplica al contexto de la organización. Se excluye del cálculo de cumplimiento en el dashboard (ISO 9001:2015 Requisito 4.3 – exclusión de alcance). **Valor por defecto** al crear evaluación. |

### Reglas de transición y cálculo automático
- **Sincronización automática (`autoUpdateEstado`):** El estado se calcula e inserta en la base de datos automáticamente cada vez que se sube, modifica, aprueba o elimina una evidencia, o al crear/eliminar una brecha (NC).
- **Preservación de Exclusión (`NA`):** Si el estado actual en la base de datos es `NA` (No Aplica), el cálculo automático se ignora y se preserva el estado `NA` intacto.
- **Sin restricciones manuales:** Aparte del cálculo automatizado, un evaluador puede cambiar el estado libremente (ej. forzar el toggle de `NA`).

#### Criterios de Negocio para la Determinación del Estado

Cuando el requisito no está excluido (es decir, su estado no es `NA`), el sistema auto-calcula el estado final evaluando las siguientes condiciones:

1. **No cumple:**
   - Si no hay evidencias cargadas ni brechas registradas (requisito sin evaluar).
   - Si existe al menos una brecha (NC) abierta.
   - Si existe al menos una evidencia con validación en estado "Rechazado".

2. **Cumple:**
   - Si hay al menos una evidencia cargada, **todas** ellas están en estado "Aceptado", y no existe ninguna brecha abierta.

3. **Parcial (En Revisión):**
   - Si hay al menos una evidencia cargada y pendiente de validación por el evaluador, y no hay evidencias rechazadas ni brechas abiertas.

### Permisos por rol (implementado)
| Acción | Roles permitidos | Código fuente |
|---|---|---|
| Obtener o crear evaluación | `Evaluador` y `Responsable SGC` (+ Admin) | `GET /api/evaluaciones/requisito/:id` — `requireRoles('Evaluador','Responsable SGC')` — `routes/evaluaciones.js:7` |
| Cambiar `estado_cumplimiento` | Solo `Evaluador` (+ Admin) | `PATCH /api/evaluaciones/:id` — `requireRoles('Evaluador')` — `routes/evaluaciones.js:10` |

> **Nota:** El `Responsable SGC` **NO puede** cambiar el estado de cumplimiento de un requisito. Solo puede ver/obtener la evaluación.

### Efectos secundarios
- **Historial (`EVALUACION_REQUISITO_HIST`):** Se inserta un snapshot con: `ev_id` (apunta a `EVALUACION_REQUISITO.id`), `estado_cumplimiento`, `ultima_edicion_por`, `fecha_snapshot`, y una `accion` descriptiva (ej: `"Estado cambiado a Cumple"`). Ver `evaluationsController.js:72-76`.
- **Notificaciones:** Actualmente **NO** se generan notificaciones automáticas al cambiar el estado de un requisito.
- **Dashboard:** El estado `NA` excluye al requisito del cálculo de porcentaje de cumplimiento en el dashboard.
- **Protección IDOR:** Se valida que la evaluación pertenezca al `workspace_id` del usuario (líneas 59-63).

### Puntos de entrada
| Capa | Ruta / Componente |
|---|---|
| **API obtener/crear** | `GET /api/evaluaciones/requisito/:id` (`:id` = `requisito_base_id`) |
| **API actualizar** | `PATCH /api/evaluaciones/:id` — body: `{ estado_cumplimiento: "Cumple" }` (`:id` = `evaluacion_requisito.id`) |
| **Ruta backend** | `routes/evaluaciones.js` → `evaluationsController.js` |
| **Frontend** | Vista de detalle de requisito, checklist de auditoría |

---

## Resumen de Tablas de Historial

| Estado | Tabla principal | Tabla historial | Tabla notificaciones |
|---|---|---|---|
| Evidencia (aprobación) | `EVIDENCIAS` | `EVIDENCIAS_LOG` | — (no implementado) |
| NC (flujo) | `AUDITORIA_NC` | `AUDITORIA_NC_HIST` | `NOTIFICACIONES` + `SCHEDULED_NOTIFICATIONS` |
| NC (aceptación) | `AUDITORIA_NC` | `AUDITORIA_NC_HIST` | `NOTIFICACIONES` |
| Acción correctiva | `ACCIONES_CORRECTIVAS` | `ACCIONES_CORRECTIVAS_HIST` | `NOTIFICACIONES` |
| Requisito (cumplimiento) | `EVALUACION_REQUISITO` | `EVALUACION_REQUISITO_HIST` | — (no implementado) |

## Resumen de Endpoints API

| Operación | Método | Endpoint |
|---|---|---|
| Aprobar/rechazar evidencia | `PATCH` | `/api/evidences/:id` |
| Cambiar flujo NC | `PATCH` | `/api/nc/:id` |
| Cambiar aceptación NC | `PATCH` | `/api/nc/:id` |
| Cambiar estado acción correctiva | `PATCH` | `/api/acciones/:id` |
| Cambiar cumplimiento requisito | `PATCH` | `/api/evaluaciones/:id` |
