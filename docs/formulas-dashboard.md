# Fórmulas del Dashboard — Documentación Matemática

Este documento detalla cada fórmula utilizada en `dashboardController.js`, su expresión matemática formal, su propósito, variables involucradas y reglas de negocio asociadas.

---

## 1. Porcentaje de Cumplimiento Global

### Expresión matemática

```
Porcentaje Cumplimiento = round( ((C + P × 0.5) / T) × 100 )
```

### Variables
| Variable | Significado |
|----------|-------------|
| C | Cantidad de requisitos con estado `Cumple` |
| P | Cantidad de requisitos con estado `Parcial` |
| T | Cantidad total de requisitos aplicables (excluyendo `NA`) |
| round() | Función de redondeo al entero más cercano |

### Propósito
Calcula el indicador principal de madurez del SGS (Sistema de Gestión de la Calidad) para el workspace.  
Los requisitos en estado `Parcial` contribuyen con la mitad del valor que un requisito `Cumple`, penalizando el cumplimiento incompleto sin descartarlo totalmente.

### Reglas de negocio
- Los requisitos marcados como `NA` (No Aplica) se excluyen del cálculo (ISO 9001:2015 Requisito 4.3 — exclusión de alcance).
- Si T = 0 (todos los requisitos son NA o no hay evaluaciones), el resultado es 0%.
- El numerador nunca excede T, por lo que el porcentaje máximo posible es 100%.

### Código fuente
`dashboardController.js` líneas 67-69.

---

## 2. Porcentaje de Cumplimiento por Cláusula

### Expresión matemática

```
Porcentaje Cláusula_i = round( ((C_i + P_i × 0.5) / T_i) × 100 )
```

### Variables
| Variable | Significado |
|----------|-------------|
| C_i | Cantidad de requisitos `Cumple` en la cláusula i |
| P_i | Cantidad de requisitos `Parcial` en la cláusula i |
| T_i | Cantidad total de requisitos aplicables en la cláusula i |
| i | Número de cláusula ISO (4, 5, 6, 7, 8 o 9) |

### Propósito
Permite visualizar el cumplimiento desagregado por cada cláusula de la norma ISO 9001.  
Se utiliza para alimentar el gráfico radar del dashboard y para identificar en qué áreas de la norma existe mayor desviación.

### Reglas de negocio
- Solo se consideran requisitos de primer nivel (`requisito_padre_id IS NULL`) para el radar chart, evitando distorsión por subrequisitos.
- Los requisitos `NA` se excluyen del cálculo dentro de cada cláusula.
- Si T_i = 0 para una cláusula, el porcentaje es 0%.

### Código fuente
`dashboardController.js` líneas 72-84.

---

## 3. Avance de Cierre de NCs por Empresa

### Expresión matemática

```
Avance Empresa = round( (NC_cerradas / NC_total) × 100 )
```

### Variables
| Variable | Significado |
|----------|-------------|
| NC_cerradas | Cantidad de NCs con `estado_flujo = 'Cerrada'` para la empresa |
| NC_total | Cantidad total de NCs asociadas a la empresa |
| round() | Redondeo al entero más cercano |

### Propósito
Mide el porcentaje de no conformidades resueltas por empresa.  
Se utiliza para clasificar a cada empresa en una de tres fases del proceso de implementación ISO.

### Clasificación resultante
| Rango | Fase |
|-------|------|
| 0% ≤ Avance ≤ 30% | `Plan de Acción` |
| 30% < Avance ≤ 80% | `Plan de Acción` (transición) |
| Avance > 80% | `Fase de Auditoría` |

### Reglas de negocio
- Si NC_total = 0, el avance es 0%.
- La clasificación es informativa y puede ajustarse en el futuro.
- Se calcula en el dashboard de administrador, no en el de evaluador ni responsable.

### Código fuente
`dashboardController.js` líneas 265-278.

---

## 4. Avance Global Total (Todas las Empresas)

### Expresión matemática

```
Avance Global = round( (Σ NC_cerradas / Σ NC_total) × 100, 1 )
```

### Variables
| Variable | Significado |
|----------|-------------|
| Σ NC_cerradas | Suma de todas las NCs cerradas en todos los workspaces |
| Σ NC_total | Suma de todas las NCs existentes en todos los workspaces |
| round(..., 1) | Redondeo a 1 decimal |

### Propósito
Indica el progreso agregado de la cartera completa de empresas hacia el cierre de no conformidades.

### Reglas de negocio
- Si Σ NC_total = 0, el avance es 0.
- Se muestra con un decimal para mayor precisión en la vista de administrador.
- No incluye filtros de fecha ni cláusula; es un agregado histórico completo.

### Código fuente
`dashboardController.js` línea 280.

---

## 5. Promedio de Días de Resolución

### Expresión matemática

```
Promedio Días = max( 0, round( AVG( GREATEST(0, DATEDIFF(fecha_cierre, fecha_ultima_accion)) ) ) )
```

### Variables
| Variable | Significado |
|----------|-------------|
| fecha_cierre | Fecha en que la NC pasó a `Cerrada` |
| fecha_ultima_accion | Fecha de la acción correctiva más reciente asociada a la NC |
| DATEDIFF(a, b) | Diferencia en días naturales entre a y b |
| GREATEST(0, x) | Máximo entre 0 y x (evita negativos) |
| AVG(...) | Promedio aritmético sobre todas las NCs cerradas |
| max(0, ...) | Asegura que el promedio no sea negativo |
| round() | Redondeo al entero más cercano |

### Propósito
Mide cuántos días transcurren, en promedio, desde la última acción correctiva hasta el cierre efectivo de la NC.  
Refleja la eficiencia del equipo para verificar la eficacia de las acciones implementadas.

### Reglas de negocio
- Solo se consideran NCs con `estado_flujo = 'Cerrada'` y `fecha_cierre` no nula.
- Solo se incluyen NCs cuyas acciones correctivas asociadas tienen todas en estado `Eficaz` (subconsulta `HAVING SUM(CASE WHEN estado_accion <> 'Eficaz' THEN 1 ELSE 0 END) = 0`).
- Si no hay NCs que cumplan los criterios, el resultado es `null` y se presenta como `0 días`.
- Si `fecha_ultima_accion` es posterior a `fecha_cierre` (error de datos), GREATEST(0, ...) fuerza el resultado a 0.

### Código fuente
`dashboardController.js` líneas 94-121.

---

## 6. Eficiencia del Proceso (NC Aceptadas vs. Resueltas)

### Expresión matemática

```
Eficiencia = round( (NC_resueltas / NC_aceptadas) × 100, 1 )
```

### Variables
| Variable | Significado |
|----------|-------------|
| NC_aceptadas | Cantidad de NCs con `estado_validacion = 'Acepto'` |
| NC_resueltas | Cantidad de NCs aceptadas que además tienen `estado_flujo = 'Cerrada'` |
| round(..., 1) | Redondeo a 1 decimal |

### Propósito
Mide la proporción de NCs que, habiendo sido aceptadas por el Responsable SGC, efectivamente llegaron a cierre.  
Indica la capacidad del proceso para convertir aceptaciones en resultados concretos.

### Reglas de negocio
- Solo se consideran NCs aceptadas (`Acepto`). Las NCs en `Parcial` o `No Acepto` no entran en el cálculo.
- Si NC_aceptadas = 0, la eficiencia es 0.0%.
- Se calcula tanto para el dashboard global como por cláusula.

### Código fuente
`dashboardController.js` líneas 126-149.

---

## 7. Porcentaje Individual por Requisito (Radar Chart)

### Expresión matemática

```
Porcentaje Requisito = { 100, si estado = 'Cumple'
                       { 50,  si estado = 'Parcial'
                       { 0,   si estado = 'No cumple' o 'NA'
```

### Propósito
Asigna un valor numérico a cada requisito para ser representado en el gráfico radar de cumplimiento por cláusula.  
Permite visualizar la distribución de cumplimiento dentro de cada área de la norma.

### Reglas de negocio
- Los requisitos `NA` aportan 0% al radar chart, aunque estén excluidos del cálculo general.
- No es un promedio; es una asignación directa por estado.
- Se utiliza tanto para requisitos generales como para requisitos de primer nivel (`requisito_padre_id IS NULL`).

### Código fuente
`dashboardController.js` líneas 208 y 214.

---

## 8. Cantidad de Tareas Pendientes

### Expresión matemática

```
Tareas Pendientes = COUNT( NCs con estado_flujo <> 'Cerrada' o NULL )
```

### Propósito
Cuenta las no conformidades que aún no han sido cerradas.  
Sirve como KPI de carga de trabajo pendiente para el evaluador y el responsable.

### Reglas de negocio
- Incluye NCs en cualquier estado excepto `Cerrada`.
- No distingue por rol; es un conteo plano de NCs abiertas.
- No aplica filtros de fecha ni cláusula en la consulta base.

### Código fuente
`dashboardController.js` líneas 158-166.

---

## Resumen de dependencias entre fórmulas

```
Cumplimiento Global y por Cláusula
    └── Depende de: estado_cumplimiento de EVALUACION_REQUISITO
    └── Excluye: requisitos NA

Avance de Cierre de NCs
    └── Depende de: estado_flujo de AUDITORIA_NC
    └── Clasifica empresas en fases

Promedio de Días de Resolución
    └── Depende de: fecha_cierre y fecha_accion
    └── Filtra: NCs cerradas con todas las acciones Eficaz

Eficiencia del Proceso
    └── Depende de: estado_validacion y estado_flujo
    └── Mide: NCs Acepto → Cerradas
```

> **Nota**: Todas las fórmulas operan sobre datos agregados a nivel de workspace (excepto el dashboard de administrador, que agrega across todos los workspaces).  
> Las fechas se manejan en zona horaria UTC en la base de datos y se filtran por `fecha_ultima_edicion` cuando se aplican filtros de fecha.
