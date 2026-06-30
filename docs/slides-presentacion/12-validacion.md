---
marp: true
paginate: true
header: "Taller de Titulación — Maximiliano Abascal"
footer: "Software Web de Gestión ISO | UDP 2026"
---

# Validación y Pruebas

## Estrategia de pruebas

| Tipo | Cantidad | Estado |
|------|----------|--------|
| Unitarias | 11 archivos | ✅ Ejecutadas |
| Integración | 3 archivos | ✅ Ejecutadas |
| Equivalencia | 1 archivo (updateAction) | ✅ Ejecutada |
| Multi-tenancy | IDOR audit (DT-003) | 🔄 Parcial |
| UAT | Plan E2E de 9 fases | 📋 Documentado |

---

# Pruebas — Cobertura

## Pruebas unitarias (11 archivos)
- Controllers: auth, usuarios, workspaces, NC, evidencias, acciones, chat
- Servicios: driveService (unit + env)
- Técnica: partición de equivalencia para updateAction

## Pruebas de integración (3 archivos)
- Flujo auth completo (login, refresh, logout)
- CRUD de usuarios con roles
- Servicio Drive (upload, download, delete)

---

# Plan de Pruebas E2E

## 9 fases documentadas (`PlanDePrueba.md`)

0. Autenticación y activación
1. Operaciones de admin (workspaces, usuarios)
2. Carga de evidencias (Responsable)
3. Auditoría y apertura de brechas (Evaluador)
4. Subsanación y cierre (flujo cruzado)
5. Estado final del requisito
6. Validación de dashboards post-ciclo
7. Operaciones destructivas
8. Timeout e inactividad
9. Seguridad y control de acceso (IDOR, escalación)
