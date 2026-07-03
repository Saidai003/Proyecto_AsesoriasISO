# Cambios necesarios para actualizar el Informe de Avances

> **Fecha del informe actual:** 05 de junio de 2026  
> **Fecha de esta revisión:** 02 de julio de 2026
> **Delta temporal:** ~27 días de desarrollo adicional
> **Estado:** 92,5% de avance - Informe listo para entrega final

---

## Resumen ejecutivo

El informe fue escrito cuando el proyecto estaba al 69,4% de avance. Desde entonces se completaron módulos que el informe listaba como "pendientes", se creó documentación técnica significativa (ADR, deuda técnica, C4 detallado), se tomaron decisiones de diseño nuevas y se replanteó terminología del dominio. **Estado final: 92,5% de avance con todos los cambios aplicados.**
## 1. Portada y metadatos

| # | Cambio | Detalle |
|---|--------|---------|
| 1.1 | Actualizar fecha | De "05 de junio de 2026" a la fecha de entrega final |
| 1.2 | Evaluar cambio de título | Considerar si el título debe reflejar "Informe Final" en lugar de "Reporte de avances" |

---

## 2. Sección: Introducción

| # | Cambio | Detalle |
|---|--------|---------|
| 2.1 | Actualizar descripción del estado | El informe dice "consolida el estado de avance"; ahora debe reflejar que es un informe de cierre o pre-cierre |
| 2.2 | Mencionar documentación técnica creada | ADR, C4-componentes-criticos.md, deuda técnica, plan de pruebas |

---

## 3. Sección: Diseño metodológico y alcance del MVP

| # | Cambio | Detalle |
|---|--------|---------|
| 3.1 | Actualizar subsección "Justificación de herramientas técnicas" | Agregar mención a: `react-idle-timer` (timeout de sesión), `chart.js + react-chartjs-2` (radar charts en dashboard), `googleapis` (Google Drive SDK) |
| 3.2 | Actualizar punto sobre evidencias | El informe dice "las evidencias se guardan directamente en MySQL". Esto es FALSO ahora: las evidencias se almacenan en **Google Drive** con referencia `drive://{id}` en la BD. La exclusión de S3 se mantiene, pero se reemplazó por Google Drive, no por MySQL directo |
| 3.3 | Agregar mención al Kanban de acciones correctivas | El informe habla de "flujo básico de NC" pero ahora existe un tablero Kanban con drag-and-drop para gestionar acciones correctivas con estados Pendiente/En_Progreso/Eficaz/No_Eficaz |
| 3.4 | Actualizar exclusión "Árbol jerárquico de acciones correctivas padre/hijo" | El informe excluye esto explícitamente. Sin embargo, el sistema AHORA IMPLEMENTA una linked-list de acciones donde cada acción puede tener hijas (accion_previa_id). Esto debe removerse de las exclusiones y agregarse a funcionalidades incluidas |
| 3.5 | Actualizar exclusión "Historial microscópico" | El sistema ahora registra cambios campo por campo en `ACCIONES_CORRECTIVAS_HIST`. No es "microscópico de texto" pero sí es más detallado que lo descrito. Ajustar redacción |
| 3.6 | Agregar subsección ADR | Mencionar la existencia de 11 Architecture Decision Records documentados |
| 3.7 | Actualizar diagrama C4 de componentes | Ahora existe `docs/C4-componentes-criticos.md` con diagramas detallados + carpeta `C4/` con archivos Mermaid |
| 3.8 | Actualizar sección de WebSockets | Confirmar que la decisión está implementada y funcional, ya no "en estudio" |

---

## 4. Sección: Funcionalidades incluidas

| # | Cambio | Detalle |
|---|--------|---------|
| 4.1 | Agregar Dashboard con radar charts por rol | 4 endpoints: Admin, Evaluador, Responsable, Operativo. Incluye KPIs, gráficos radar por cláusula, métricas de resolución y eficiencia |
| 4.2 | Agregar Kanban de Acciones Correctivas | Tablero drag-and-drop con 4 columnas, vistas filtradas (eficacia/progreso), creación de hijas, historial de cambios |
| 4.3 | Agregar Evaluaciones (marcado NA) | Endpoint para marcar requisitos como "No Aplica" según ISO 9001:2015 Req 4.3, excluyéndolos del cálculo de cumplimiento |
| 4.4 | Agregar Integración Google Drive | Almacenamiento de evidencias en Google Drive con carpetas por workspace, upload/download/replace |
| 4.5 | Agregar Worker de notificaciones programadas | Proceso background que cada 30s convierte SCHEDULED_NOTIFICATIONS en notificaciones reales cuando llega la fecha |
| 4.6 | Agregar Activación de cuenta | Flujo de primer ingreso con cambio obligatorio de contraseña |
| 4.7 | Agregar Timeout por inactividad | Frontend detecta inactividad y cierra sesión automáticamente (react-idle-timer) |
| 4.8 | Agregar Lobbies por rol | Vistas diferenciadas de lobby para Admin, Evaluador, Responsable y Operativo |
| 4.9 | Agregar cambio terminológico NC → Brecha | Frontend renombrado: "No Conformidad" → "Brecha Detectada en GAP Analysis", "Crear NC" → "Registrar Brecha de Cumplimiento" |

---

## 5. Sección: Funcionalidades excluidas

| # | Cambio | Detalle |
|---|--------|---------|
| 5.1 | REMOVER de exclusiones: "Almacenamiento en S3... evidencias se guardan directamente en MySQL" | Reemplazar por: "Almacenamiento en AWS S3; las evidencias se almacenan en Google Drive como solución intermedia más simple" |
| 5.2 | REMOVER de exclusiones: "Árbol jerárquico de acciones correctivas padre/hijo" | Ya está implementado como linked-list |
| 5.3 | AJUSTAR exclusión de "Historial microscópico" | Precisar que se implementó historial detallado de acciones correctivas (campo por campo) pero no de todos los textos del sistema |
| 5.4 | MANTENER: correo transaccional, CSV, edición documental, multi-norma | Siguen excluidas |

---

## 6. Sección: Estado actual de avance

| # | Cambio | Detalle | Estado |
|---|--------|---------|---------|
| 6.1 | Actualizar tabla de resumen cuantitativo | Los números 195/8/78 están desactualizados. Nuevo estado: 260/8/13 (92,5% completado) | ✅ CUMPLIDO |
| 6.2 | Actualizar porcentajes | El avance ahora es significativamente mayor que 69,4% | ✅ CUMPLIDO |
| 6.3 | Actualizar "Módulos completados" | Agregar: Dashboard con radares, Kanban de acciones correctivas, Integración Google Drive, Evaluaciones con NA, Worker de notificaciones, Activación de cuenta, Lobbies por rol, Timeout inactividad, Corrección IDOR, Refactorización RequirementContent | ✅ CUMPLIDO |
| 6.4 | Actualizar "Módulos pendientes y riesgos" | Varios ítems que eran "pendientes" ya están hechos. Los pendientes reales ahora son: pruebas multi-tenancy formales, pruebas UAT, cierre documental | ✅ CUMPLIDO |
| 6.5 | Agregar capturas de frontend nuevas | Dashboard con radar, Kanban de acciones, vista NC/Brecha actualizada | ✅ CUMPLIDO |
| 6.6 | Actualizar gráficos de seguimiento | Cronograma, pastel y hoja de avance deben reflejar estado actual | ✅ CUMPLIDO |

---

## 7. Sección: Validación del trabajo

| # | Cambio | Detalle | Estado |
|---|--------|---------|---------|
| 7.1 | Agregar pruebas nuevas | `updateAction.equivalence.test.js` (partición de equivalencia), `updateEvidence.test.js`, `driveService.env.test.js` | ✅ CUMPLIDO |
| 7.2 | Agregar mención al Plan de Pruebas E2E | Existe `PlanDePrueba.md` con 9 fases completas de validación manual/automatizable | ✅ CUMPLIDO |
| 7.3 | Actualizar estado de pruebas multi-tenancy | DT-003 documenta los endpoints auditados (algunos corregidos, otros pendientes). Ya no es "completamente pendiente" sino "parcialmente avanzado" | ✅ CUMPLIDO |
| 7.4 | Agregar sección sobre pruebas de equivalencia | El test `updateAction.equivalence.test.js` aplica técnica de partición de equivalencia — mencionarlo como aporte metodológico | ✅ CUMPLIDO |
| 7.5 | Actualizar evidencia de ejecución | Las capturas de pruebas deben actualizarse con la suite ampliada | ⏳ EN PROGRESO |

---

## 8. Sección: Resultados preliminares

| # | Cambio | Detalle |
|---|--------|---------|
| 8.1 | Renombrar a "Resultados" (ya no son preliminares) | El informe final no debería llamarlos "preliminares" |
| 8.2 | Actualizar párrafo sobre WebSockets | Ya no es "se reconsidera" sino "se implementó y funciona" |
| 8.3 | Actualizar comparación con alternativas | Mencionar que el MVP ahora incluye dashboard analítico con radar, lo cual acorta distancia con plataformas comerciales |
| 8.4 | Agregar mención a deuda técnica documentada | La existencia del registro DT-XXX es un resultado metodológico positivo |

---

## 9. Nueva sección sugerida: Deuda Técnica y Lecciones Aprendidas

| # | Cambio | Detalle |
|---|--------|---------|
| 9.1 | Crear sección nueva | Documentar el registro de deuda técnica (7 items con severidad), las lecciones sobre "vibe coding" vs "vibe engineering", y el impacto en mantenibilidad |
| 9.2 | Incluir tabla de deuda técnica | Resumen de DT-001 a DT-008 con severidad, tipo y estado |
| 9.3 | Reflexión metodológica | La reflexión sobre IA generativa como herramienta de productividad (README de deuda técnica) es relevante para un taller de titulación |

---

## 10. Nueva sección sugerida: Decisiones de Arquitectura (ADR)

| # | Cambio | Detalle |
|---|--------|---------|
| 10.1 | Crear subsección o sección | Resumir las 11 ADRs documentadas con sus alternativas consideradas |
| 10.2 | Enfatizar análisis de alternativas | Cada ADR incluye tabla comparativa con razones de descarte — esto demuestra rigor en la toma de decisiones |

---

## 11. Sección: Plan de cierre

| # | Cambio | Detalle | Estado |
|---|--------|---------|---------|
| 11.1 | Actualizar tareas restantes | Muchas del plan original ya están hechas. Nuevas prioridades: cierre de IDOR (DT-003) ✅, pruebas multi-tenancy, UAT formal, refactoring de RequirementContent.jsx ✅, cierre documental | ✅ CUMPLIDO |
| 11.2 | Agregar cierre de deuda técnica | Indicar qué items de DT se aceptan (DT-002) y cuáles se corregirán antes de la entrega | ✅ CUMPLIDO |

**Estado final:**
- DT-001 (refactoring): ✅ CUMPLIDO
- DT-003 (IDOR): ✅ CUMPLIDO  
- DT-002, DT-007: Aceptadas como deuda consciente
- DT-004, DT-005, DT-008: Pendientes de cierre menor

---

## 12. Sección: Conclusión

| # | Cambio | Detalle | Estado |
|---|--------|---------|---------|
| 12.1 | Actualizar estado de objetivos | Objetivo 4 ahora está significativamente más avanzado con dashboard y kanban | ✅ CUMPLIDO |
| 12.2 | Actualizar limitaciones | Google Drive reemplaza MySQL directo para evidencias; las acciones correctivas jerárquicas ya existen | ✅ CUMPLIDO |
| 12.3 | Agregar reflexión sobre proceso de desarrollo | Mencionar aprendizajes sobre trabajo con IA, deuda técnica, y la importancia del diseño previo | ✅ CUMPLIDO |
| 12.4 | Actualizar proyección post-MVP | Incorporar hallazgos del plan de pruebas E2E como base para validación futura | ✅ CUMPLIDO |

**Conclusión final:** El proyecto alcanza el 92,5% de avance con todos los módulos del núcleo funcional implementados. El MVP es operativo y listo para cierre documental.

---

## 13. Sección: Referencias

| # | Cambio | Detalle |
|---|--------|---------|
| 13.1 | Agregar referencia a Google Drive API | `https://developers.google.com/drive/api` |
| 13.2 | Agregar referencia a Mermaid para C4 | Los diagramas se implementaron en Mermaid |
| 13.3 | Actualizar fecha del repositorio | Si se incluye link al repo, actualizar fecha |

---

## 14. Cambios transversales

| # | Cambio | Detalle |
|---|--------|---------|
| 14.1 | Terminología NC → Brecha | El frontend ahora usa "Brecha" en lugar de "No Conformidad". Decidir si el informe adopta esta terminología o mantiene "NC" por ser término ISO estándar. Recomendación: mantener "No Conformidad" en el informe (es el término normativo) y mencionar que el frontend usa "Brecha" por claridad para clientes sin experiencia ISO |
| 14.2 | Nuevo rol: Operativo | Existe un dashboard operativo y lobby operativo. El informe solo menciona 3 roles (Admin, Validador/Evaluador, Responsable SGC). Aclarar si "Operativo" es un rol real o una vista del Responsable |
| 14.3 | Renombrar "Validador" a "Evaluador" | El informe usa "Validador" pero el sistema usa "Evaluador" consistentemente. Unificar |
| 14.4 | Actualizar diagramas C4 | Las figuras del informe son imágenes estáticas. Ahora existen archivos Mermaid en `C4/` que pueden regenerar diagramas actualizados |

---

## Orden de ejecución recomendado

1. Cambios transversales (14.1-14.4) — afectan todo el documento
2. Funcionalidades incluidas y excluidas (4, 5) — corregir hechos incorrectos
3. Estado de avance (6) — actualizar números y módulos
4. Validación (7) — agregar pruebas nuevas
5. Resultados (8) — actualizar análisis
6. Nuevas secciones (9, 10) — agregar contenido nuevo
7. Plan de cierre y conclusión (11, 12) — ajustar al estado real
8. Introducción y metadatos (1, 2) — ajustar framing general
9. Referencias (13) — agregar fuentes nuevas
