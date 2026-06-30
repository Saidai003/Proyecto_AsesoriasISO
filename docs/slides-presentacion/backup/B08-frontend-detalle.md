---
marp: true
paginate: true
header: "BACKUP — Preguntas de Comisión"
footer: "Software Web de Gestión ISO | UDP 2026"
---

# Frontend — Decisiones Técnicas

## ¿Por qué React y no Vue/Angular?

| Criterio | React | Vue | Angular |
|----------|-------|-----|---------|
| Ecosistema | Más grande | Menor | Completo pero pesado |
| Experiencia equipo | ✅ | Parcial | ❌ |
| Componentes reutilizables | ✅ | ✅ | ✅ |
| Hot reload (Vite) | ✅ | ✅ | Parcial |
| Flexibilidad de diseño | Alta | Alta | Opinionado |

---

# Frontend — ¿Por qué sin state manager global?

## No se usa Redux, Zustand ni MobX

**Razón:** el estado es local a cada página.

- Auth global → Context API + custom hook (`useAuth`)
- Datos de página → `useState` + `useEffect` local
- Formularios → `react-hook-form` (no re-renders del form completo)

## ¿Cuándo agregaría Redux?
- Si múltiples páginas comparten estado mutable complejo
- Si se necesita time-travel debugging
- Para este MVP, Context es suficiente

---

# Frontend — Estructura de Componentes

```
src/
├── pages/           (12 archivos + 4 lobby por rol)
├── components/      (15 componentes reutilizables)
├── hooks/           (3 custom hooks: useISO, useUsers, useWorkspaces)
├── lib/             (5 utilidades: api, toast, errors, ncHelpers, userUtils)
└── AuthContext.jsx  (proveedor global de autenticación)
```

## Componentes destacados
- `ActionKanbanBoard` — Drag-and-drop con 4 columnas
- `Dashboard` — Radar charts con Chart.js
- `Chat` — WebSocket en tiempo real
- `UploadArea` — Zona de carga de evidencias
- `Protected` — HOC para rutas protegidas por rol
