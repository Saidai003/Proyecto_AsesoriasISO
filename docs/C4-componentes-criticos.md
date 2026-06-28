# C4 — Componentes Críticos (Nivel 3)

> Documentación orientada al 20% del sistema que genera el 80% de las dudas.  
> Enfocada en las relaciones de datos, máquinas de estado, y flujos entre módulos.

---

## 1. Árbol Normativo ISO 9001:2015

### Modelo de datos

```
ISOS (id=1, nombre="ISO 9001:2015")
  │
  └── CLAUSULAS (iso_id=1)
        ├── id=1, numero_clausula=4, titulo="Contexto de la organización"
        ├── id=2, numero_clausula=5, titulo="Liderazgo"
        ├── ...
        └── id=7, numero_clausula=10, titulo="Mejora"
              │
              └── REQUISITOS_BASE (clausula_id=7)
                    ├── id=80, requisito_padre_id=NULL, "10.1 Generalidades"
                    ├── id=81, requisito_padre_id=NULL, "10.2 No conformidad..."
                    │     ├── id=82, requisito_padre_id=81, "10.2.1 Reacción..."
                    │     └── id=83, requisito_padre_id=81, "10.2.2 Conservación..."
                    └── id=84, requisito_padre_id=NULL, "10.3 Mejora continua"
```

### Relaciones clave

- **ISOS → CLAUSULAS**: 1 ISO tiene N cláusulas (FK `iso_id`)
- **CLAUSULAS → REQUISITOS_BASE**: 1 cláusula tiene N requisitos (FK `clausula_id`)
- **REQUISITOS_BASE → REQUISITOS_BASE**: Autorreferencia (FK `requisito_padre_id` → self). `NULL` = raíz de la cláusula.

### Cómo se construye el árbol (backend)

El endpoint `GET /api/isos/:id/tree` ejecuta `getISOTree()`:

```
1. SELECT ISO metadata
2. SELECT todas las CLAUSULAS del ISO (ORDER BY numero_clausula)
3. Para cada cláusula:
   a. SELECT todos los REQUISITOS_BASE de esa cláusula
   b. buildRequisitosMap():
      - Primer paso: indexar todos por ID en un Map, parsear "4.1 Comprensión..." → { number: "4.1", name: "Comprensión..." }
      - Segundo paso: recorrer cada uno y si tiene requisito_padre_id, adjuntarlo a parent.children[]. Si no tiene padre → root.
   c. Resultado: { map: {id→nodo}, roots: [nodos raíz con .children anidados] }
4. Retorna: { iso, clauses: [{ id, numero_clausula, titulo, requisitos: [árbol], requisitosMap: {...} }] }
```

### Cómo se relaciona con evaluaciones

```
REQUISITOS_BASE (la norma, compartida)
      │
      │  1 requisito tiene 1 evaluación POR WORKSPACE
      ▼
EVALUACION_REQUISITO (requisito_base_id + workspace_id)
      │                estado_cumplimiento: Cumple | Parcial | No cumple | NA
      │
      ├── EVIDENCIAS (evidencia de cumplimiento, n por evaluación)
      └── AUDITORIA_NC (brechas detectadas, n por evaluación)
```

**Punto clave:** `EVALUACION_REQUISITO` es la tabla PIVOT central. Todo lo que es "per-workspace" (evidencias, brechas, historial) cuelga de aquí.

---

## 2. Brechas (AUDITORIA_NC)

### Modelo de datos

```
AUDITORIA_NC
├── evaluacion_requisito_id  → vincula a un requisito + workspace
├── evaluador_id             → quién la creó
├── estado_flujo             → máquina de estados principal
├── estado_validacion        → aprobación del evaluador
├── titulo, descripcion      → contenido descriptivo
├── fecha_verificacion_eficacia → cuándo verificar (futuro)
└── ultima_edicion_por, fecha_ultima_edicion → trazabilidad
```

### Máquina de estados (estado_flujo)

```
                     ┌─── Responsable SGC ───┐
                     ▼                       ▼
┌─────────┐     ┌──────────┐     ┌──────────────┐
│ Abierta │────►│ Análisis │────►│  Ejecución   │
└────┬────┘     └──────────┘     └──────────────┘
     │                                    │
     │         ┌──────────────────────────┘
     │         │ Evaluador (requiere fecha futura)
     │         ▼
     │    ┌──────────────┐
     ├───►│ Verificación │ ← programar notificación en fecha
     │    └──────┬───────┘
     │           │ Evaluador
     │           ▼
     │    ┌──────────┐
     └───►│ Cerrada  │
          └──────────┘

Reglas:
- Responsable SGC: solo puede mover de Abierta → Análisis o Ejecución
- Evaluador: puede mover a Abierta, Verificación o Cerrada
- Verificación: REQUIERE fecha_verificacion_eficacia en el futuro
  → Al llegar esa fecha, se dispara SCHEDULED_NOTIFICATIONS → NOTIFICACIONES
```

### Estado de validación (paralelo)

```
estado_validacion: Acepto | Parcial | No Acepto
```

Esto lo cambia el Evaluador y es independiente del flujo. Es su "visto bueno" sobre la evidencia/trabajo presentado.

### Tablas asociadas

```
AUDITORIA_NC
├── AUDITORIA_NC_RESPONSABLES (pivot: asigna responsables a la brecha)
├── AUDITORIA_NC_HIST (snapshot de cada cambio de estado)
├── ACCIONES_CORRECTIVAS (planes de acción para cerrar la brecha)
└── CHAT_MESSAGES (nc_id → mensajes del equipo sobre esta brecha)
```

---

## 3. Acciones Correctivas (hilo padre-hijo)

### Modelo de datos

```
ACCIONES_CORRECTIVAS
├── auditoria_nc_id    → pertenece a una brecha
├── accion_previa_id   → FK a otra ACCIONES_CORRECTIVAS (NULL = primera acción)
├── autor_id           → quién la creó
├── tipo_autor         → Evaluador | Responsable SGC | Sistema
├── nc                 → texto de la brecha (desnormalizado para referencia)
├── accion             → qué hacer (el plan)
├── contenido_comentario → observaciones
├── estado_accion      → máquina de estados
├── acciones_futuras_propuestas → texto libre de próximos pasos
└── fecha_accion       → timestamp de creación/última actualización
```

### Estructura del hilo (linked list)

```
Brecha NC #5
  │
  ├── Acción #1 (accion_previa_id = NULL)  ← primera acción
  │     estado: Eficaz
  │
  ├── Acción #2 (accion_previa_id = 1)    ← hija de #1
  │     estado: En_Progreso
  │
  └── Acción #3 (accion_previa_id = 2)    ← hija de #2 (nieta de #1)
        estado: Pendiente
```

Es una **linked list** donde cada acción apunta a su predecesora. Se lee de arriba a abajo (cronológico) o se recorre la cadena hacia atrás.

### Máquina de estados (estado_accion)

```
┌───────────┐     ┌─────────────┐     ┌────────┐
│ Pendiente │────►│ En_Progreso │────►│ Eficaz │
└───────────┘     └──────┬──────┘     └────────┘
                         │
                         └────────────►┌───────────┐
                                       │ No_Eficaz │
                                       └───────────┘

Reglas:
- Solo Responsable SGC o Admin pueden cambiar estado
- Cada cambio genera un registro en ACCIONES_CORRECTIVAS_HIST
- Cada cambio notifica a los responsables de la NC padre
```

### Eliminación en cascada

Al eliminar una acción, se buscan todas las hijas recursivamente y se eliminan de abajo hacia arriba:

```
deleteAction(id=1):
  1. Buscar todos los hijos: accion_previa_id = 1 → [2], accion_previa_id = 2 → [3]
  2. toDelete = [1, 2, 3]
  3. Eliminar en orden inverso: DELETE #3, DELETE #2, DELETE #1
```

---

## 4. Evidencias

### Modelo de datos

```
EVIDENCIAS
├── evaluacion_requisito_id  → vincula a un requisito + workspace
├── usuario_carga_id         → quién subió
├── ev_id                    → evaluador asignado
├── nombre_archivo           → nombre original
├── url_archivo              → siempre "drive://{drive_file_id}"
├── drive_file_id            → ID del archivo en Google Drive
├── tipo_formato             → pdf, jpg, csv, etc.
├── estado_validacion_archivo → Pendiente | Aceptado | Rechazado
├── comentario_evidencia     → nota del que subió
└── fecha_carga              → timestamp
```

### Integración con Google Drive

```
Google Drive
└── GOOGLE_DRIVE_FOLDER_ID (raíz configurada)
    └── Development | Production (según NODE_ENV)
        └── {nombre_workspace} (carpeta por cliente)
            └── archivos de evidencia
```

**Flujo de upload:**
```
1. Frontend envía base64 en payload.fileData (data:mime;base64,...)
2. Backend parsea mime + content
3. driveService.ensureFolder(rootId, workspaceName) → crea/encuentra carpeta
4. driveService.uploadBuffer({ buffer, mimeType, name, parents: [folderId] })
5. Drive retorna: { id, webViewLink, webContentLink }
6. Se guarda en DB: drive_file_id = id, url_archivo = "drive://{id}"
```

### Máquina de estados (estado_validacion_archivo)

```
┌───────────┐     ┌──────────┐
│ Pendiente │────►│ Aceptado │
└─────┬─────┘     └──────────┘
      │
      └──────────►┌───────────┐
                  │ Rechazado │
                  └───────────┘

Reglas:
- Solo Evaluador o Admin pueden cambiar este estado
- Cada cambio se loguea en EVIDENCIAS_LOG
```

### Versionado

No hay varias "versiones" como filas separadas. El versionado se implementa como **reemplazo del archivo**:
1. Se sube un nuevo archivo a Drive (via `updateFile` o nuevo `uploadBuffer`)
2. Se actualiza `drive_file_id` en la fila de EVIDENCIAS
3. Se registra en `EVIDENCIAS_LOG` con tipo_accion = 'REPLACE' + detalle del comentario

---

## 5. Chat

### Modelo de datos

```
CHAT_MESSAGES
├── requisito_id   → contexto: mensaje sobre un requisito (nullable)
├── nc_id          → contexto: mensaje sobre una brecha (nullable)
├── accion_id      → contexto: mensaje sobre una acción (nullable)
├── evidencia_id   → contexto: mensaje sobre una evidencia (nullable)
├── autor_id       → quién escribió
├── contenido      → texto del mensaje
├── referencia_type + referencia_id → link genérico a cualquier entidad
├── metadata       → JSON con { author: { id, nombre, rol }, ... }
└── created_at, edited_at
```

### Cómo se asocia

Un mensaje pertenece a **un contexto** (requisito O brecha O acción O evidencia):

```
Requisito 4.1 (vista de evaluación)
  └── Chat: mensajes con requisito_id = <evaluacion_requisito_id>

Brecha NC #5 (vista de brecha)
  └── Chat: mensajes con nc_id = 5
```

### Tiempo real

```
Frontend                              Backend
────────                              ───────
POST /api/chat                    →   chatController.postMessage()
{ nc_id, contenido }                  INSERT → SELECT → broadcast('chat:new', msg)
                                                          │
                                                          ▼ WebSocket
                                      ←── ws message: { type: 'chat:new', data: msg }
Todos los clientes conectados reciben el mensaje en tiempo real
```

---

## 6. Diagrama de relaciones central (EVALUACION_REQUISITO como pivot)

```
                    REQUISITOS_BASE
                    (la norma ISO)
                         │
                         │ requisito_base_id
                         ▼
              ┌─────────────────────────┐
              │   EVALUACION_REQUISITO  │ ← PIVOT CENTRAL
              │   (por workspace)       │
              │   estado_cumplimiento   │
              └────┬──────────┬─────────┘
                   │          │
     workspace_id  │          │ evaluacion_requisito_id
                   │          │
    ┌──────────────┘          └──────────────────────┐
    ▼                                                ▼
ESPACIO_TRABAJO                              ┌───────────────┐
(el cliente)                                 │  EVIDENCIAS   │
                                             │  (archivos)   │
                                             └───────────────┘
                                                     │
                                             ┌───────────────┐
                                             │ AUDITORIA_NC  │
                                             │  (brechas)    │
                                             └───────┬───────┘
                                                     │
                                          ┌──────────┼──────────┐
                                          ▼          ▼          ▼
                                   ACCIONES    NC_HIST    CHAT_MESSAGES
                                   CORRECTIVAS
                                        │
                                        ▼
                                   ACCIONES_HIST
```

---

## 7. Aislamiento por Workspace (patrón de seguridad)

Todas las queries de datos sensibles (brechas, evidencias, acciones) validan workspace a través de un JOIN:

```sql
-- Ejemplo: obtener brechas de un requisito
SELECT a.* FROM AUDITORIA_NC a
JOIN EVALUACION_REQUISITO er ON a.evaluacion_requisito_id = er.id
WHERE er.id = ? AND er.workspace_id = ?
```

Esto previene **IDOR (Insecure Direct Object Reference)**: un usuario de workspace A no puede ver datos de workspace B aunque adivine el ID.

El patrón se repite en: `ncController`, `accionesController`, `evidenceController`.
