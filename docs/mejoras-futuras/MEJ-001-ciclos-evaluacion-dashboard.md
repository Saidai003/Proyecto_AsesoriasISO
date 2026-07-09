# MEJ-001: Soporte futuro para ciclos de evaluación en dashboards

**Prioridad:** Media
**Tipo:** Mejora futura
**Archivo(s):** backend-js/src/controllers/dashboardController.js

## Contexto
El sistema actual no tiene un concepto explícito de ciclo de evaluación ISO. Cuando se inicia un nuevo ciclo, las métricas siguen considerando eventos históricos si no se filtra de forma manual por fechas o por un punto de referencia. Esto puede hacer que los indicadores se vuelvan poco fiables y no reflejen el estado real del ciclo activo.

## Propuesta
En una siguiente iteración, conviene introducir un concepto formal de ciclo de evaluación, por ejemplo con:
- una tabla de ciclos de evaluación,
- una fecha de inicio de ciclo,
- y una referencia por la que medir cumplimiento, resolución y avance.

## Nota
Mientras tanto, el controlador ya se ajustó para evitar sobreconteos usando `COUNT(DISTINCT nc.id)` en los agregados principales.
