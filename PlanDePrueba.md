# Plan de Pruebas E2E Automatizable y Humano - Plataforma GAP Analysis (Sovereign QMS)

**Objetivo:** Validar el ciclo de vida completo de la plataforma: Gestión de usuarios por el Administrador, flujo de autenticación, carga de evidencias físicas, gestión de Brechas (NC), acciones correctivas, notificaciones, dashboards por rol, y verificación del estado final de cumplimiento.
**Archivo de Evidencia Estándar para el Test:** `gatito.png`

**Precondición Global:** La base de datos contiene al menos una Norma ISO (ej: ISO 9001) con su árbol de cláusulas y requisitos ya poblado (vía seed o migración). Google Drive está configurado y con token activo.

---

## 🔐 FASE 0: Autenticación y Activación de Cuenta

### 0.1 Login como Administrador
1. Ir a la raíz de la aplicación (`/login`).
2. Ingresar las credenciales por defecto del Admin (email + contraseña).
3. Hacer clic en el botón **"Ingresar"**.
4. **Resultado Esperado:**
   - El sistema redirige automáticamente a `/lobby`.
   - Se muestra el **"Dashboard General"** con el sidebar de Admin (Panel Principal, Espacios de Trabajo, Usuarios).
   - El `accessToken` se almacena correctamente (verificable en las cabeceras de las peticiones subsecuentes).

### 0.2 Activación de Cuenta (Flujo de primer ingreso)
*Nota: Este flujo aplica cuando un usuario creado por el Admin accede por primera vez con estado de invitación "Pendiente".*
1. Navegar a `/activate` (o ser redirigido automáticamente tras primer login).
2. Introducir una nueva contraseña segura (mínimo 12 caracteres, mayúsculas, números y símbolos).
3. Confirmar la contraseña.
4. Hacer clic en **"Activar Cuenta"**.
5. **Resultado Esperado:** La cuenta queda activada y el usuario puede iniciar sesión normalmente.

### 0.3 Navegación con retroceso del navegador
1. **Acción:** Estando en cualquier vista interna (ej: `/workspaces`), hacer clic en el botón de **"Retroceder" (Flecha Izquierda) del navegador web**.
2. **Resultado Esperado:** El sistema regresa a la vista anterior (`/lobby`) manteniendo la sesión activa y el token válido.

### 0.4 Cierre de Sesión (Logout)
1. Cerrar la sesión (vía mecanismo disponible en la UI o llamando a `POST /auth/logout`).
2. **Resultado Esperado:** La cookie de refresh se invalida. Intentar acceder a `/lobby` redirige a `/login`.

### 0.5 Refresh de Token
1. Esperar a que el `accessToken` esté próximo a expirar (o forzar la expiración).
2. **Resultado Esperado:** El frontend realiza automáticamente un `POST /auth/refresh` y renueva el token sin intervención del usuario.

---

## 🏢 FASE 1: Operaciones de Control Global (Rol: Administrador)
**Objetivo:** Verificar las rutas de administración de accesos, organizaciones y asignación de normas.

### 1.1 Gestión de Workspaces
1. Iniciar sesión como Admin y navegar a **"Espacios de Trabajo"** (`/workspaces`) desde el sidebar.
2. Hacer clic en crear nuevo workspace. Completar el formulario (nombre de la empresa de prueba, ej: *"Empresa TestE2E"*).
3. **Resultado Esperado:**
   - El workspace aparece en la tabla de espacios de trabajo.
   - El backend crea automáticamente filas de `EVALUACION_REQUISITO` para todos los requisitos existentes en la norma (estado inicial `"NA"`).

### 1.2 Alta de Usuarios y Asignación de Roles
1. Navegar a **"Usuarios"** (`/users`) desde el sidebar.
2. Crear un usuario **Evaluador** (auditor interno):
   - Nombre: *"Evaluador Prueba"*
   - Email: *evaluador@test.com*
   - Contraseña: (asignar una)
   - Workspace: Seleccionar *"Empresa TestE2E"*
   - Rol: Seleccionar **"Evaluador"** (role_id correspondiente)
3. Crear un usuario **Responsable SGC** (dueño del proceso):
   - Nombre: *"Responsable Prueba"*
   - Email: *responsable@test.com*
   - Contraseña: (asignar una)
   - Workspace: Seleccionar *"Empresa TestE2E"*
   - Rol: Seleccionar **"Responsable SGC"** (role_id correspondiente)
4. **Resultados Esperados:**
   - Ambos usuarios aparecen en la tabla de usuarios con su rol y workspace asignado.
   - No se permite crear usuarios con email duplicado (verificar error 409 si se reintenta).

### 1.3 Dashboard del Administrador
1. Regresar a **"Panel Principal"** (`/lobby`).
2. **Resultado Esperado:** El dashboard muestra:
   - Total de No Conformidades identificadas.
   - Número de Empresas Activas (debe incluir la recién creada).
   - % de Avance Global.
   - Tabla de "Empresas en Proceso de Implementación" con la empresa de prueba.

### 1.4 Admin accede al árbol ISO de un Workspace
1. Desde la tabla de empresas o mediante parámetro `?workspace=<id>`, acceder al contexto del workspace.
2. **Resultado Esperado:** El sidebar cambia al árbol de cláusulas ISO (NavBarISO), mostrando las Cláusulas y Requisitos de la norma asignada.

---

## 📝 FASE 2: Carga de Evidencias de Cumplimiento (Rol: Responsable SGC)
**Objetivo:** Verificar la capacidad del usuario operativo para responder a las exigencias normativas.

### 2.1 Login y Dashboard Operativo
1. Cerrar sesión del Admin. Iniciar sesión con el usuario `responsable@test.com`.
2. **Resultado Esperado:**
   - Se muestra el **"Dashboard Operativo"** con métricas: NC Identificadas y En Progreso.
   - El sidebar muestra el árbol ISO con cláusulas y requisitos.

### 2.2 Navegación al Requisito
1. En el sidebar (NavBarISO), expandir una cláusula y hacer clic en un requisito específico.
2. **Resultado Esperado:** Se carga la vista `/requisitos/:id` mostrando:
   - Subrequisitos (si existen).
   - Sección "Archivos" (sin evidencias aún).
   - Sección "No conformidades" (vacía).
   - Componente de Chat.
   - Componente `UploadArea` visible para cargar archivos.

### 2.3 Carga de Evidencia
1. Hacer clic en el área de carga (`UploadArea`).
2. Seleccionar el archivo local **`gatito.png`**.
3. **Resultados Esperados:**
   - El archivo se sube exitosamente a Google Drive (en la carpeta `workspace/evaluacion_id/`).
   - Aparece en el grid de evidencias con:
     - Thumbnail/preview renderizado (es una imagen PNG).
     - Estado de validación: **"Pendiente"** (badge amarillo).
     - Nombre del archivo visible.
     - Botones disponibles: "Descargar", "Cambiar", "Eliminar".
   - **NO** hay indicador de semáforo automático global visible en esta vista (el `estado_cumplimiento` en DB permanece en `"NA"` ya que no existe lógica automática de recalcular en backend).

### 2.4 Agregar Comentario a la Evidencia
1. Hacer clic sobre la evidencia `gatito.png` en el grid para abrir el modal de detalle.
2. Escribir un comentario: *"Matriz de riesgos v1"*.
3. Hacer clic en **"Guardar"**.
4. **Resultado Esperado:** El comentario se persiste y es visible al reabrir el modal.

---

## 🔍 FASE 3: Auditoría, Rechazo y Apertura de Brechas (Rol: Evaluador)
**Objetivo:** Validar las facultades del auditor para rechazar documentos y documentar no conformidades.

### 3.1 Login y Dashboard del Evaluador
1. Cerrar sesión del Responsable. Iniciar sesión con `evaluador@test.com`.
2. **Resultado Esperado:**
   - Se muestra el **"Dashboard Evaluador"** con KPIs: Promedio de Resolución, Eficiencia de Proceso, CSAT.
   - Tablas: "Requerimientos Por Verificar" y "Evidencias Pendientes de Revisión".
   - La evidencia `gatito.png` aparece en la tabla de pendientes de revisión (si la consulta incluye el workspace).

### 3.2 Rechazar Evidencia
1. Navegar al mismo requisito donde se cargó `gatito.png`.
2. En la tarjeta de la evidencia, utilizar el **selector de estado** (dropdown visible solo para Evaluador) y cambiar de **"Pendiente"** a **"Rechazado"**.
3. **Resultados Esperados:**
   - El badge de la evidencia cambia a **rojo** ("Rechazado").
   - Se registra en `EVIDENCIAS_LOG` una acción tipo `APPROVAL` con detalle *"Aprobación: Pendiente → Rechazado"*.
   - Toast de confirmación: *"Estado actualizado: Rechazado"*.

### 3.3 Verificar Historial de la Evidencia
1. Hacer clic en el icono de **Historial** (reloj) de la evidencia `gatito.png`.
2. **Resultado Esperado:** Se abre el modal `EvidenceHistoryModal` mostrando al menos 2 entradas:
   - `UPLOAD` — *"Evidencia cargada: gatito.png"* (por Responsable Prueba).
   - `APPROVAL` — *"Aprobación: Pendiente → Rechazado"* (por Evaluador Prueba).

### 3.4 Registrar No Conformidad (Brecha)
1. Hacer clic en el botón **"Crear NC"** (visible solo para Evaluador en la sección "No conformidades").
2. Completar el formulario modal:
   - Título: *"Evidencia de riesgos no conforme"*
   - Descripción: *"Se requiere corregir el archivo cargado. El documento no corresponde a la matriz de riesgos."*
   - En el buscador de responsables, buscar y seleccionar al usuario `Responsable Prueba`.
3. Guardar.
4. **Resultados Esperados:**
   - Toast: *"NC creada: NC #<ID>"*.
   - La NC aparece en la tabla de "No conformidades" del requisito con:
     - ID autogenerado.
     - Título: *"Evidencia de riesgos no conforme"*.
     - Estado flujo: **"Abierta"**.
     - Estado validación: **"Parcial"** (valor por defecto al crear).
   - Se crea una notificación para el Responsable (tipo `NC_ASIGNADA`) con link `/nc/<ID>`.

---

## 🔔 FASE 3.5: Verificación de Notificaciones (Rol: Responsable SGC)
**Objetivo:** Validar que el sistema de notificaciones funciona correctamente.

1. Cerrar sesión del Evaluador. Iniciar sesión como `responsable@test.com`.
2. **Resultado Esperado:**
   - El icono de campana (Bell) en el header muestra un badge numérico con al menos **1** notificación no leída.
   - En el sidebar, la cláusula del requisito afectado muestra un badge rojo con el conteo.
3. Hacer clic en la campana o navegar al sidebar.
4. **Resultado Esperado:** La notificación indica: *"Se le asignó una No Conformidad (#<ID>): Evidencia de riesgos no conforme"* con link a `/nc/<ID>`.
5. Hacer clic en la notificación.
6. **Resultado Esperado:** Se navega a la vista de la NC (`/nc/:id`).

---

## 🛠️ FASE 4: Subsanación y Cierre Exitoso (Flujo Cruzado Responsable ➡️ Evaluador)
**Objetivo:** Validar que el ciclo se cierra de manera conforme.

### 4.1 Responsable: Crear Acción Correctiva
1. Estando en la vista `/nc/:id` como Responsable:
2. En el Kanban de Acciones Correctivas, crear una nueva acción raíz:
   - Acción: *"Reemplazar evidencia con la matriz de riesgos correcta"*
   - Comentario: *"Se procederá a cargar el documento correcto"*
   - Estado: **"Pendiente"**
3. **Resultado Esperado:**
   - La acción aparece en el tablero Kanban en la columna "Pendiente".
   - Se genera una notificación tipo `ACCION_NC` para el Evaluador.

### 4.2 Responsable: Cambiar estado de validación de la NC
1. En la vista `/nc/:id`, hacer clic en el botón de **Estado de Validación** (solo Responsable puede cambiarlo).
2. Seleccionar **"Acepto"** (el responsable acepta la observación del evaluador).
3. **Resultado Esperado:** El botón cambia a verde con texto "Acepto".

### 4.3 Responsable: Cambiar estado de flujo de la NC
1. Hacer clic en el botón de **Estado de Flujo**.
2. Opciones disponibles para Responsable: "Análisis" o "Ejecución" (solo desde estado "Abierta").
3. Seleccionar **"Ejecución"** (indicando que ya está ejecutando el plan de acción).
4. Hacer clic en **"Guardar"** (botón de guardar los cambios de la NC).
5. **Resultados Esperados:**
   - Toast: *"NC actualizada: Cambios guardados"*.
   - El estado de flujo cambia a **"Ejecución"**.
   - Se genera notificación `NC_UPDATED` para el Responsable (confirmación).
   - Se registra en `AUDITORIA_NC_HIST` el cambio de estado.

### 4.4 Responsable: Subir evidencia corregida
1. Regresar a la vista del requisito (`/requisitos/:id`) usando el sidebar.
2. Subir nuevamente **`gatito.png`** como nueva evidencia (simulando la versión corregida).
3. **Resultado Esperado:**
   - Nueva evidencia aparece en el grid con estado **"Pendiente"**.
   - Ahora hay 2 evidencias: la rechazada y la nueva pendiente.

### 4.5 Evaluador: Aprobar nueva evidencia
1. Cerrar sesión del Responsable. Iniciar sesión como `evaluador@test.com`.
2. Navegar al requisito.
3. Localizar la **nueva** evidencia `gatito.png` (la que tiene estado "Pendiente").
4. Cambiar su estado a **"Aceptado"** mediante el selector.
5. **Resultado Esperado:** Badge cambia a verde "Aceptado". Log tipo `APPROVAL` registrado.

### 4.6 Evaluador: Verificar y Cerrar la NC
1. Navegar a la NC (`/nc/:id`) desde la tabla de No Conformidades del requisito (botón "Ver").
2. Cambiar el **Estado de Flujo** a **"Verificación"**.
   - Se solicita una **fecha de verificación de eficacia** (debe ser una fecha futura).
   - Seleccionar una fecha futura.
3. Hacer clic en **"Guardar"**.
4. **Resultado Esperado:**
   - Estado cambia a "Verificación".
   - Se programa una notificación futura (SCHEDULED_NOTIFICATIONS).
5. (Opcional para test rápido) Cambiar directamente el estado a **"Cerrada"**:
   - Seleccionar "Cerrada" en el dropdown de Estado de Flujo.
   - Guardar.
6. **Resultado Esperado:**
   - Estado de flujo: **"Cerrada"**.
   - El estado de flujo ya no puede ser modificado (estado final).

---

## ✅ FASE 5: Verificación de Estado Final del Requisito
**Objetivo:** Confirmar que el estado de cumplimiento refleja la realidad del requisito.

### 5.1 Estado de las evidencias
1. Regresar a la vista del requisito (`/requisitos/:id`).
2. **Resultado Esperado:** El grid de evidencias muestra:
   - `gatito.png` (original) — Estado: **"Rechazado"** (rojo).
   - `gatito.png` (corregido) — Estado: **"Aceptado"** (verde).

### 5.2 Estado de las No Conformidades
1. En la sección "No conformidades" de la misma vista.
2. **Resultado Esperado:** La NC muestra:
   - Estado flujo: **"Cerrada"** (badge verde).
   - Estado validación: **"Acepto"** (badge verde).

### 5.3 Historial Global de Evidencias
1. Hacer clic en **"Historial global"**.
2. **Resultado Esperado:** El modal muestra el timeline completo:
   - UPLOAD (Responsable) — gatito.png
   - APPROVAL (Evaluador) — Rechazado
   - UPLOAD (Responsable) — gatito.png (segunda carga)
   - APPROVAL (Evaluador) — Aceptado

### 5.4 Chat del Requisito
1. Escribir un mensaje en el componente de Chat: *"Ciclo de NC completado satisfactoriamente"*.
2. **Resultado Esperado:** El mensaje aparece en el feed de chat asociado al requisito.

---

## 📊 FASE 6: Validación de Dashboards Post-Ciclo

### 6.1 Dashboard Evaluador
1. Navegar al Lobby (`/lobby`) como Evaluador.
2. **Resultado Esperado:**
   - La tabla "Evidencias Pendientes de Revisión" ya **no** muestra las evidencias del requisito de prueba (ambas ya revisadas).
   - Los KPIs se actualizan (Promedio de Resolución refleja tiempo transcurrido de la NC).

### 6.2 Dashboard Operativo
1. Iniciar sesión como Responsable.
2. Navegar al Lobby.
3. **Resultado Esperado:**
   - Tabla "Estado Operativo de No Conformidades": la NC de prueba aparece como **"Cerrada"**.

### 6.3 Dashboard Admin
1. Iniciar sesión como Admin.
2. Navegar al Lobby.
3. **Resultado Esperado:**
   - "Total No Conformidades" se incrementó en 1.
   - La tabla de empresas muestra a "Empresa TestE2E" con progreso actualizado.

---

## 🗑️ FASE 7: Limpieza y Operaciones Destructivas (Opcional)

### 7.1 Eliminar una evidencia
1. Como Responsable, hacer clic en **"Eliminar"** en la evidencia rechazada.
2. Confirmar en el diálogo.
3. **Resultado Esperado:** La evidencia se borra de la DB y de Google Drive.

### 7.2 Eliminar una Acción Correctiva
1. Como Evaluador, ir a la NC y eliminar la acción correctiva creada.
2. **Resultado Esperado:** La acción y sus sub-acciones (si las hubiera) se eliminan en cascada.

### 7.3 Eliminar una NC
1. Como Evaluador, eliminar la NC desde la vista del requisito.
2. **Resultado Esperado:** La NC se elimina junto con sus registros pivot (AUDITORIA_NC_RESPONSABLES).

### 7.4 Eliminar Workspace y Usuarios
1. Como Admin, eliminar los usuarios de prueba.
2. Eliminar el workspace de prueba.
3. **Resultado Esperado:** Los registros se eliminan correctamente sin errores de FK.

---

## ⏱️ FASE 8: Pruebas de Timeout e Inactividad

### 8.1 Idle Timeout (Configurado via `VITE_IDLE_MINUTES`)
1. Iniciar sesión y dejar la plataforma inactiva durante el tiempo configurado (default: 30 min, o reducir para test).
2. **Resultado Esperado:** El sistema cierra sesión automáticamente y redirige a `/login`.

---

## 🛡️ FASE 9: Pruebas de Seguridad y Control de Acceso

### 9.1 Acceso no autorizado a rutas protegidas
1. Sin token (sesión cerrada), intentar acceder a `/lobby`.
2. **Resultado Esperado:** Redirige a `/login`.

### 9.2 IDOR (Insecure Direct Object Reference)
1. Como Responsable del workspace A, intentar acceder a una NC de otro workspace (vía URL directa `/nc/:id-ajeno`).
2. **Resultado Esperado:** Respuesta 404 ("not_found") — no se filtra información.

### 9.3 Escalación de privilegios
1. Como Responsable, intentar crear una NC (POST `/api/nc`) o eliminar un usuario (DELETE `/api/users/:id`).
2. **Resultado Esperado:** Respuesta 403 ("forbidden").

### 9.4 Token expirado
1. Usar un token JWT expirado manualmente en una petición.
2. **Resultado Esperado:** Respuesta 401 ("invalid_token").

---

## 📋 Resumen de Roles y Rutas Clave

| Rol | Frontend (Rutas) | Acciones Principales |
|-----|-------------------|---------------------|
| **Admin** | `/lobby`, `/workspaces`, `/users` | CRUD workspaces, CRUD usuarios, dashboards globales |
| **Evaluador** | `/lobby`, `/requisitos/:id`, `/nc/:id` | Revisar evidencias (Aceptar/Rechazar), Crear/Cerrar NCs, Cambiar flujo a Verificación/Cerrada |
| **Responsable SGC** | `/lobby`, `/requisitos/:id`, `/nc/:id` | Cargar evidencias, Cambiar validación NC (Acepto/Parcial/No Acepto), Cambiar flujo a Análisis/Ejecución, Crear acciones correctivas |

---

## 📋 Flujos de Estado Referencia

**Evidencia:** `Pendiente` → `Aceptado` | `Rechazado` (solo Evaluador cambia)

**NC - Estado de Flujo:**
```
Abierta ──[Responsable]──→ Análisis
Abierta ──[Responsable]──→ Ejecución
Cualquiera ──[Evaluador]──→ Verificación (requiere fecha futura)
Cualquiera ──[Evaluador]──→ Cerrada (estado final)
```

**NC - Estado de Validación:** `Parcial` (default) | `Acepto` | `No Acepto` (solo Responsable cambia)

**Acciones Correctivas:** `Pendiente` → `En_Progreso` → `Eficaz` | `No_Eficaz`
