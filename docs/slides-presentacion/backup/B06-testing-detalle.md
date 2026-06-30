---
marp: true
paginate: true
header: "BACKUP — Preguntas de Comisión"
footer: "Software Web de Gestión ISO | UDP 2026"
---

# Testing — Estrategia y Herramientas

## Stack de pruebas

| Herramienta | Propósito |
|------------|-----------|
| Jest | Test runner, assertions, mocking |
| Supertest | HTTP requests contra Express app |
| cross-env | Variables de entorno en tests |

## Estructura

```
pruebas/
├── unitarias/         (11 archivos)
│   ├── authController.test.js
│   ├── ncController.test.js
│   ├── updateAction.equivalence.test.js
│   └── ...
└── integracion/       (3 archivos)
    ├── auth.integration.test.js
    ├── users.integration.test.js
    └── driveService.integration.test.js
```

---

# Testing — Partición de Equivalencia

## updateAction.equivalence.test.js

Técnica formal aplicada al endpoint más complejo:

| Clase | Input | Resultado esperado |
|-------|-------|-------------------|
| Estado válido | "En_Progreso" | 200, estado actualizado |
| Estado inválido | "Invalido" | 400, error |
| ID inexistente | 99999 | 404, not_found |
| Sin payload | {} | 200 (no-op) |
| Otro workspace | ID ajeno | 404 (IDOR) |

Demuestra aplicación de técnica de caja negra formal.

---

# Testing — ¿Qué falta?

## Pruebas Multi-Tenancy (DT-003)
- Verificar que usuario A no acceda a datos de workspace B
- Cubrir todos los endpoints sensibles
- Automatizable como suite de integración

## Pruebas UAT
- Plan documentado en `PlanDePrueba.md` (9 fases)
- Requiere ejecución con contraparte (María + Ricardo)
- Cubre flujo completo: admin → responsable → evaluador → cierre

## Pruebas E2E automatizadas
- No implementadas (fuera de alcance MVP)
- Candidatas: Cypress o Playwright para futuro
