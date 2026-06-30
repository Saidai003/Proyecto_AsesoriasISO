---
marp: true
paginate: true
header: "Taller de Titulación — Maximiliano Abascal"
footer: "Software Web de Gestión ISO | UDP 2026"
---

# Conclusiones

- El MVP es **funcional** como base operativa para GAP Análisis ISO 9001:2015
- Se implementó el ciclo completo: diagnóstico → brechas → acciones → cierre
- La arquitectura soporta multi-tenancy con segregación verificable
- Dashboard analítico con radar acorta distancia con soluciones comerciales
- El registro de deuda técnica y ADRs demuestra madurez en la gestión del proyecto

---

# Limitaciones

- No incluye: correo transaccional, soporte multi-norma, automatizaciones avanzadas
- IDOR: algunos endpoints aún requieren auditoría (documentado en DT-003)
- Pruebas multi-tenancy y UAT formales aún pendientes
- RequirementContent.jsx (1200+ líneas) requiere refactoring
- El MVP no alcanza la amplitud de plataformas comerciales maduras

---

# Trabajo Futuro

## Corto plazo (cierre MVP)
- Completar correcciones IDOR
- Ejecutar pruebas multi-tenancy formales
- Realizar UAT con la contraparte

## Mediano plazo
- Soporte multi-norma (ISO 27001, medioambiente)
- IA agente (no solo conversacional, sino que opera sobre datos)
- Importación inteligente de documentos
- Reutilización de información entre módulos

## Largo plazo
- Plataforma SaaS comercializable
- Historial detallado auditable
- Integración con herramientas externas

---

# ¡Gracias!

**Maximiliano Abascal Fredes**  
Universidad Diego Portales — 2026

¿Preguntas?
