# Fórmulas del Dashboard — Documentación Matemática y Técnica

Este documento detalla la especificación de las fórmulas matemáticas, lógicas de negocio y filtros dinámicos aplicados en el controlador [dashboardController.js](file:///c:/Users/Maxim/Desktop/ProyectoISO/backend-js/src/controllers/dashboardController.js).

---

## 1. Filtros Generales (`buildFilters`)

### Propósito
Construcción dinámica de condiciones SQL para filtrar registros de auditoría y evaluación en base a rangos temporales o cláusulas específicas de la norma.

### Lógica / SQL
* **Rango de fechas**: Si existen `startDate` y `endDate` en la query, se filtra por ese rango en `fecha_ultima_edicion`.
* **Filtro por defecto**: Si no se definen fechas, se limita a los últimos 6 meses.
* **Cláusula**: Si se define `clause`, se filtra exactamente por el número de cláusula.

```sql
-- Si startDate y endDate existen:
AND prefix.fecha_ultima_edicion BETWEEN ? AND ?

-- Si no existen:
AND prefix.fecha_ultima_edicion >= DATE_SUB(NOW(), INTERVAL 6 MONTH)

-- Si se define clause:
AND c.numero_clausula = ?
```

### Código fuente
[dashboardController.js (líneas 10-28)](file:///c:/Users/Maxim/Desktop/ProyectoISO/backend-js/src/controllers/dashboardController.js#L10-L28).

---

## 2. Porcentaje de Cumplimiento Global

### Expresión matemática

$$\text{Porcentaje Cumplimiento} = \text{round}\left( \frac{\text{Cumple} + (\text{Parcial} \times 0.5)}{\text{Total Requisitos Aplicables}} \times 100 \right)$$

### Variables
| Variable | Significado |
|----------|-------------|
| Cumple | Cantidad de requisitos con estado `Cumple` |
| Parcial | Cantidad de requisitos con estado `Parcial` |
| Total Requisitos Aplicables | Cantidad total de requisitos evaluados, excluyendo los `NA` |
| round() | Función de redondeo al entero más cercano |

### Propósito
Calcula el indicador principal de madurez del SGC (Sistema de Gestión de la Calidad) para el espacio de trabajo. Los requisitos en estado `Parcial` contribuyen con el 50% de su valor, penalizando el cumplimiento incompleto sin descartarlo totalmente.

### Reglas de negocio
* **Exclusión de NA**: Los requisitos marcados como `NA` (No Aplica) se excluyen del cálculo (ISO 9001:2015 Requisito 4.3).
* Si el total de requisitos aplicables es 0, el resultado por defecto es `0%`.

### Código fuente
[dashboardController.js (líneas 60-69)](file:///c:/Users/Maxim/Desktop/ProyectoISO/backend-js/src/controllers/dashboardController.js#L60-L69).

---

## 3. Porcentaje de Cumplimiento por Cláusula

### Expresión matemática

$$\text{Porcentaje Cláusula}_i = \text{round}\left( \frac{\text{Cumple}_i + (\text{Parcial}_i \times 0.5)}{\text{Total Requisitos Aplicables}_i} \times 100 \right)$$

### Variables
| Variable | Significado |
|----------|-------------|
| $\text{Cumple}_i$ | Cantidad de requisitos `Cumple` en la cláusula $i$ |
| $\text{Parcial}_i$ | Cantidad de requisitos `Parcial` en la cláusula $i$ |
| $\text{Total Requisitos Aplicables}_i$ | Cantidad total de requisitos aplicables en la cláusula $i$ (excluyendo `NA`) |
| $i$ | Número de cláusula ISO (4, 5, 6, 7, 8 o 9) |

### Propósito
Visualizar el nivel de cumplimiento desagregado por cada cláusula de la norma ISO 9001 para identificar brechas específicas de manera modular.

### Reglas de negocio
* **Nota sobre Subrequisitos**: A diferencia de la lista de requisitos radar (`requisitosRadar`), que filtra solo los requisitos de primer nivel (`requisito_padre_id IS NULL`), el cálculo del porcentaje de cumplimiento por cláusula (`porcentaje`) en el backend considera **todos** los requisitos aplicables de la cláusula (incluyendo subrequisitos).
* Los requisitos `NA` se excluyen dentro de cada cláusula.
* Si el total de requisitos aplicables en la cláusula es 0, el porcentaje es `0%`.

### Código fuente
[dashboardController.js (líneas 72-84)](file:///c:/Users/Maxim/Desktop/ProyectoISO/backend-js/src/controllers/dashboardController.js#L72-L84).

---

## 4. Avance de Cierre de NCs por Empresa (Dashboard Admin)

### Expresión matemática

$$\text{Avance Empresa} = \text{round}\left( \frac{\text{NC Cerradas}_{\text{empresa}}}{\text{Total NC}_{\text{empresa}}} \times 100 \right)$$

### Variables
| Variable | Significado |
|----------|-------------|
| $\text{NC Cerradas}_{\text{empresa}}$ | Cantidad de NCs con `estado_flujo = 'Cerrada'` para la empresa |
| $\text{Total NC}_{\text{empresa}}$ | Cantidad total de NCs asociadas a la empresa |

### Propósito
Mide el porcentaje de no conformidades resueltas a nivel de empresa/workspace. Se utiliza para clasificar automáticamente a cada empresa en una fase de su proceso de consultoría/certificación.

### Clasificación de Estado resultante
* **Avance > 80%**: `'Fase de Auditoría'`
* **30% < Avance ≤ 80%**: `'Plan de Acción'`
* **Avance ≤ 30%**: `'Fase Documental'`

### Código fuente
[dashboardController.js (líneas 262-278)](file:///c:/Users/Maxim/Desktop/ProyectoISO/backend-js/src/controllers/dashboardController.js#L262-L278).

---

## 5. Avance Global Total (Dashboard Admin)

### Expresión matemática

$$\text{Avance Global} = \left( \frac{\sum \text{NC Cerradas}_{\text{todas}}}{\sum \text{Total NC}_{\text{todas}}} \times 100 \right) \text{ (formateado a 1 decimal)}$$

### Propósito
Indica el progreso agregado de la cartera completa de empresas registradas en la plataforma hacia el cierre de no conformidades.

### Código fuente
[dashboardController.js (línea 280)](file:///c:/Users/Maxim/Desktop/ProyectoISO/backend-js/src/controllers/dashboardController.js#L280).

---

## 6. Promedio de Días de Resolución de NC

### Expresión matemática

$$\text{Promedio Días} = \text{round}\left( \text{AVG}\left( \max(0, \text{fecha\_cierre} - \text{fecha\_accion}_{\text{última\_correctiva}}) \right) \right)$$

### Propósito
Mide cuántos días transcurren, en promedio, desde la fecha de la última acción correctiva eficaz hasta el cierre efectivo de una No Conformidad (NC).

### Reglas de negocio
* Solo aplica a NCs con `estado_flujo = 'Cerrada'` y `fecha_cierre IS NOT NULL`.
* Exclusividad de eficacia: La acción correctiva considerada debe pertenecer a un grupo donde todas las acciones correctivas de la NC estén en estado `Eficaz` (evaluado con `HAVING SUM(CASE WHEN estado_accion <> 'Eficaz' THEN 1 ELSE 0 END) = 0`).
* Si no hay NCs que cumplan los criterios, el resultado devuelto es `0 días`.

### Código fuente
[dashboardController.js (líneas 94-121)](file:///c:/Users/Maxim/Desktop/ProyectoISO/backend-js/src/controllers/dashboardController.js#L94-L121).

---

## 7. Eficiencia del Proceso (NC Aceptadas vs. Resueltas)

### Expresión matemática

$$\text{Eficiencia} = \left( \frac{\text{NC Cerradas y Aceptadas}}{\text{Total NC Aceptadas}} \times 100 \right) \text{ (formateado a 1 decimal)}$$

### Propósito
Mide la proporción de No Conformidades que, habiendo sido explícitamente validadas/aceptadas (`estado_validacion = 'Acepto'`), llegaron a resolverse de manera efectiva (`estado_flujo = 'Cerrada'`).

### Reglas de negocio
* Solo considera NCs con `estado_validacion = 'Acepto'`.
* Si la cantidad de NCs aceptadas es 0, la eficiencia por defecto es `0.0%`.

### Código fuente
[dashboardController.js (líneas 125-149)](file:///c:/Users/Maxim/Desktop/ProyectoISO/backend-js/src/controllers/dashboardController.js#L125-L149).

---

## 8. Porcentaje Individual por Requisito (Radar Chart)

### Expresión matemática
El porcentaje de cumplimiento asignado individualmente a cada requisito para mostrar en los listados del gráfico de radar es:

* **100%**: Si el estado es `'Cumple'`
* **50%**: Si el estado es `'Parcial'`
* **0%**: Si el estado es `'No cumple'` o `'NA'`

### Código fuente
[dashboardController.js (líneas 204-215)](file:///c:/Users/Maxim/Desktop/ProyectoISO/backend-js/src/controllers/dashboardController.js#L204-L215).

---

## 9. Cantidad de Tareas Pendientes

### Lógica
Cuenta cuántas No Conformidades asociadas al espacio de trabajo no se encuentran en estado de cierre.

```sql
SELECT COUNT(*) as pendientes
FROM AUDITORIA_NC nc
WHERE nc.estado_flujo IS NULL OR nc.estado_flujo <> 'Cerrada'
```

### Código fuente
[dashboardController.js (líneas 158-166)](file:///c:/Users/Maxim/Desktop/ProyectoISO/backend-js/src/controllers/dashboardController.js#L158-L166).
