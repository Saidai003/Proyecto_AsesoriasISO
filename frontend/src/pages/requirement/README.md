# Plan: Segmentación de RequirementContent

**Nombre del plan:** `REFACTOR-001-requirement-content-split`  
**Estado:** Pendiente  
**Prioridad:** Alta (deuda técnica, dificulta mantenimiento y trazabilidad)  
**Riesgo:** Medio-alto (sin tests de frontend, requiere validación manual completa)  
**Prerequisito:** Ejecutar con la app corriendo y probar cada sección manualmente tras el refactor.

## Problema

`RequirementContent.jsx` tiene 1210 líneas en un solo componente. Mezcla:
- Carga de datos (evidencias, NCs, evaluación)
- Lógica de permisos
- Filtros y cálculos
- Render de 5 secciones visuales distintas
- 3 modales

Esto dificulta: entender el código, hacer cambios seguros, y localizar bugs.

## Plan de ejecución

### Paso 1: Extraer hook `useRequirementData.js`
Mover toda la carga de datos a un hook custom:
- `loadEvidences()`, `loadNCs()`, `setEvaluacionId`, `manualNA`
- El hook retorna: `{ evidences, ncList, evaluacionId, manualNA, toggleNA, reload }`

### Paso 2: Extraer `SubrequisitosNav.jsx`
Componente presentacional simple:
- Props: `children` (array de subrequisitos), `navigate`
- Retorna: botones de navegación

### Paso 3: Extraer `EvidenceSection.jsx`
Componente con la lista de archivos + filtros + upload:
- Props: `evidences, blobUrls, user, evaluacionId, onUpload, onDelete, onApprove, onUpdate`
- Incluye: filtros de estado/tipo, grid de cards, botones de acción

### Paso 4: Extraer `NCSection.jsx`
Componente con la lista de brechas + filtros:
- Props: `ncList, user, evaluacionId, onNavigateNC, filters`
- Incluye: filtros avanzados, tabla/lista de NCs, badges de estado

### Paso 5: Extraer `HistoryModal.jsx`
Modal de historial global de evidencias:
- Props: `open, logs, loading, page, onClose, onPageChange, filters`

### Paso 6: Extraer `NCGlobalHistoryModal.jsx`
Modal de historial global de brechas:
- Props: `open, logs, loading, page, onClose, onPageChange, filters`

### Paso 7: Reducir `RequirementContent.jsx` a coordinador
Debería quedar en ~300-400 líneas:
- Importa el hook + los 5 componentes
- Gestiona estados compartidos
- Pasa props y callbacks

## Estructura final esperada

```
pages/
├── RequirementView.jsx           (sin cambios)
├── RequirementContent.jsx        (~400 líneas, coordinador)
└── requirement/
    ├── useRequirementData.js     (hook de datos)
    ├── SubrequisitosNav.jsx      (~30 líneas)
    ├── EvidenceSection.jsx       (~250 líneas)
    ├── NCSection.jsx             (~300 líneas)
    ├── HistoryModal.jsx          (~100 líneas)
    └── NCGlobalHistoryModal.jsx  (~100 líneas)
```

## Validación post-refactor

Probar manualmente:
1. Navegar entre requisitos (estado no se "contagia")
2. Subir evidencia + ver preview
3. Aprobar/rechazar evidencia (como Evaluador)
4. Crear brecha + asignar responsable
5. Cambiar estado de brecha
6. Marcar como No Aplica + verificar que persiste
7. Ver historial global (evidencias y brechas)
8. Enviar mensaje en chat
9. Verificar que el badge de estado se actualiza correctamente
