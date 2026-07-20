# DT-009: Cobertura pendiente de funciones críticas

**Severidad:** Alta  
**Tipo:** Calidad / Pruebas  
**Archivo(s):** `backend-js/src/controllers/dashboardController.js`, `backend-js/src/controllers/evidenceController.js`, `backend-js/src/controllers/authController.js`, `backend-js/src/controllers/userController.js`, `backend-js/src/controllers/ncController.js`, `backend-js/src/services/driveService.js`

## Problema

El reporte de Jest del 19/07/2026 ejecutó 85 pruebas y omitió 4. Existen funciones críticas nunca invocadas y flujos principales recorridos sólo de forma parcial. Las pruebas de integración se omiten por defecto; Google Drive requiere credenciales y modifica recursos externos.

## Funciones y escenarios recomendados

### Prioridad alta

| Archivo | Funciones o flujos pendientes | Pruebas recomendadas |
|---|---|---|
| `authController.js` | `firstLoginPasswordChange`, `checkRateLimit`, `incrementRateLimit`, `clearRateLimit` | Activación, validaciones, cuenta ya activada, cinco intentos fallidos, expiración de ventana y error de base de datos. |
| `authController.js` | `refresh` exitoso y alternativo | Sesión válida o expirada, usuario inexistente, rol, timeout y error de base de datos. |
| `userController.js` | `updateUser`, `updateUserPassword`, `listUsers`, `listResponsables`, `assignUserToWorkspace` | Éxito y error, email duplicado, aislamiento por workspace, asignación y desasignación. |
| `driveService.js` | `getDriveRootFolderId`, `createOAuth2Client`, `loadSavedToken`, `saveToken`, `generateAuthUrl`, `getTokenFromCode`, `hasSavedToken`, `uploadBuffer`, `ensureFolder`, `findFileInFolder`, `deleteFile`, `updateFile`, `getFileMeta`, `downloadFile` | Unitarias con mocks de `googleapis` y sistema de archivos; integración temporal de carga, consulta, actualización, descarga y eliminación. |
| `dashboardController.js` | `getAdminDashboard` | Éxito, filtros, empresas sin NC, cálculo de avance, estados y error de base de datos. |

### Prioridad media

| Archivo | Funciones o flujos pendientes | Pruebas recomendadas |
|---|---|---|
| `dashboardController.js` | Cálculos de `buildComplianceDashboard` | Datos no vacíos con `Cumple`, `Parcial`, `No cumple` y `NA`; cláusulas, radar y KPI. |
| `evidenceController.js` | `buildRequisitoFolderNameByEvaluacionId` y ramas Drive | Descripción válida, ausencia de evaluación, normalización, carpeta o archivo existente y carga nueva. |
| `ncController.js` | Ramas internas de funciones ya invocadas | Creación, transiciones, cierre, validación, historial y errores de persistencia. |

### Prioridad baja

Ampliar Evaluaciones, Acciones Correctivas y Notificaciones para cubrir errores, filtros, entradas opcionales y resultados vacíos.

## Criterios de aceptación

1. Cada función pública señalada tiene prueba de éxito y prueba negativa relevante.
2. Los flujos de autenticación verifican controles de seguridad y revocación de sesiones.
3. Los cálculos del dashboard se prueban con datos no vacíos y resultados esperados.
4. Drive tiene pruebas unitarias sin credenciales reales y una integración temporal con limpieza.
5. La matriz de cobertura diferencia pruebas ejecutadas de integraciones omitidas.

## Relación con otras deudas

DT-009 consolida la deuda de pruebas del proyecto e identifica las funciones y escenarios concretos detectados en el reporte de cobertura.

La función privada `sanitizeForFolderName` de `evidenceController.js` fue eliminada el 19/07/2026 porque no tenía llamadas ni exportaciones.

## Estado

Pendiente
## Anexo: fuente, método y alcance de Chat

Los porcentajes se obtienen al ejecutar desde la raíz del proyecto:

```powershell
npx jest --coverage
```

Jest usa Istanbul para generar una tabla por archivo con `% Stmts`, `% Branch`, `% Funcs` y `% Lines`. La matriz usa `% Funcs` y `% Lines` del controlador o servicio asociado a cada requisito. Los mismos datos se pueden consultar en `coverage/coverage-final.json`, `coverage/lcov.info` y `coverage/lcov-report/index.html`. La carpeta `coverage/` es un artefacto local de verificación y no debe versionarse.

En la ejecución del 19/07/2026 se registraron 85 pruebas aprobadas y 4 omitidas. Cada cambio de código o pruebas requiere ejecutar nuevamente el comando y actualizar la matriz con ese resultado.

### Chat

`backend-js/src/controllers/chatController.js` debe figurar como **Aprobado** en la matriz de cobertura: **95,38% de líneas**, **100% de funciones** y **86,90% de sentencias**. Sus funciones públicas `getMessages` y `postMessage` fueron ejecutadas por las pruebas unitarias y de aislamiento multi-tenancy.

Este resultado cubre el controlador HTTP. Las pruebas end-to-end del transporte WebSocket siguen condicionadas a `RUN_INTEGRATION=true`, por lo que no deben confundirse con la cobertura verde del controlador.
### Relación con el SRS

La versión SRS 3.2 entregada como referencia no define un requisito `RF-CHAT-*` y su matriz RF–RNF tampoco contiene una fila de Chat. Por ello, la cobertura de `chatController.js` debe informarse como funcionalidad implementada fuera del alcance formal del SRS, salvo que el SRS sea actualizado y se le asigne un ID oficial. No se inventa un ID para la matriz normativa.