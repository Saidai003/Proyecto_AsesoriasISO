---
marp: true
paginate: true
header: "BACKUP — Preguntas de Comisión"
footer: "Software Web de Gestión ISO | UDP 2026"
---

# Seguridad — Detalle Técnico

## Autenticación

| Componente | Implementación |
|-----------|----------------|
| Access Token | JWT firmado, 30 min, en localStorage |
| Refresh Token | UUID en tabla SESSIONS, 24h, cookie HttpOnly + SameSite=Strict |
| Hashing | bcryptjs (salt rounds automáticos) |
| Revocación | Logout borra SESSIONS; cambio de contraseña invalida todo |

---

# Seguridad — RBAC

## Middleware encadenado

```javascript
router.post('/nc', authenticate, requireRole('evaluador'), createNC)
```

- 3 roles hardcoded en tabla ROLES (no cambian en runtime)
- Admin tiene bypass implícito (puede acceder a todo)
- Seguridad a nivel de datos via JOINs (workspace_id)

## IDOR Protection

```sql
-- Patrón en todos los controllers sensibles:
SELECT ac.* FROM ACCIONES_CORRECTIVAS ac
JOIN AUDITORIA_NC anc ON ac.auditoria_nc_id = anc.id
JOIN EVALUACION_REQUISITO er ON anc.evaluacion_requisito_id = er.id
WHERE ac.id = ? AND er.workspace_id = ?
```

---

# Seguridad — ¿Por qué no OAuth externo?

| Criterio | OAuth (Auth0/Firebase) | JWT propio |
|----------|----------------------|------------|
| Control | Dependencia de tercero | Total |
| Costo | Mensual por usuarios | $0 |
| On-premise | No viable | ✅ |
| Revocación | Depende del proveedor | DB propia |
| Complejidad | Menor implementación | Mayor, pero auditable |

**Decisión:** el proyecto es self-hosted y la empresa quiere control total de datos de clientes.
