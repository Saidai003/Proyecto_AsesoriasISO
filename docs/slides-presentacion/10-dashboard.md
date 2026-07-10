---
marp: true
paginate: true
header: "Taller de Titulación — Maximiliano Abascal"
footer: "Software Web de Gestión ISO | UDP 2026"
---

# Dashboard Analítico

## 4 dashboards por rol

| Rol | Métricas principales |
|-----|---------------------|
| Admin | Total NC, empresas activas, avance global, tabla de empresas |
| Evaluador | Radar por cláusula, KPIs de resolución/eficiencia, pendientes |
| Responsable | Cumplimiento general, brechas, radar, KPIs por cláusula |
| Operativo | NC identificadas, en progreso, tabla de estado operativo |

---

# Dashboard — Radar de Cumplimiento

<!-- Insertar captura del dashboard con radar chart -->

- **Radar global:** cumplimiento por cláusula ISO 9001 (cláusulas 4 a 9)
- **Drill-down por cláusula:** radar de requisitos de primer nivel
- **Cálculo de avance por cláusula:**
  - % = round((Cumple + 0.5 × Parcial) / Total aplicables × 100)
  - excluye requisitos NA según ISO 9001:2015 4.3
- **Cálculo de avance global ISO:**
  - % = round((Total Cumple + 0.5 × Total Parcial) / Total aplicables × 100)
  - permite comparar avance de toda la norma a partir de cada requisito
- **Punto de radar por requisito:**
  - Cumple → 100%
  - Parcial → 50%
  - No cumple / otros → 0%

---

# KPI Dashboard — Por qué y cómo

- **Promedio de resolución:** días entre cierre de la brecha y la última acción correctiva eficaz
  - fórmula: % = round(AVG(GREATEST(0, DATEDIFF(fecha_cierre, fecha_última_acción_eficaz))), 0)
  - solo considera NC `Cerrada`
  - solo si todas las acciones de la NC son `Eficaz`
- **Eficiencia de proceso:** % de NC validadas como `Acepto` que ya están cerradas
  - fórmula: % = round((NC cerradas con `Acepto` / NC con `Acepto`) × 100, 1)
- **Tareas pendientes:** número de NC abiertas o en verificación
- **Razón del diseño:**
  - radar global muestra salud por cláusula, no por cantidad de requisitos
  - el cálculo puntea parciales como medio cumplimiento
  - la resolución mide cierre efectivo, no solo tránsito de estados
