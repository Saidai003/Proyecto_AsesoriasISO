# DT-007: Historial de acciones se inserta en dos filas cuando podría ser una

**Severidad:** Baja  
**Tipo:** Mantenibilidad / Limpieza  
**Archivo(s):** `backend-js/src/controllers/accionesController.js` (función `updateAction`)

## Problema

Cuando un usuario cambia el estado de una acción Y edita campos de texto en la misma request, se insertan 2 filas en `ACCIONES_CORRECTIVAS_HIST`:

1. Una con `estado_anterior`/`estado_nuevo` + comentario del cambio de estado
2. Otra con `null`/`null` + "Campos modificados: ..."

La segunda fila con `null → null` se muestra rara en el frontend (la línea de estado aparece vacía).

## Solución propuesta

Unificar en un solo INSERT al final de la función. Concatenar el comentario del cambio de estado con el detalle de campos modificados si ambos ocurren:

```js
// Al final, un solo INSERT con toda la info
const histComentario = [payload.comentario, changeDetails.length ? `Campos modificados: ${changeDetails.join('; ')}` : ''].filter(Boolean).join(' | ')
await pool.execute(
  'INSERT INTO ACCIONES_CORRECTIVAS_HIST (...) VALUES (...)',
  [id, prevState || null, newState || null, user.id, histComentario]
)
```

Esto genera 1 fila completa en vez de 2 parciales.

## Impacto

- No afecta negativamente como está — funciona, los datos se registran
- Mejoraría la visualización en el frontend (menos filas con null→null)
- Reduce filas innecesarias en la tabla de historial

## Estado

Pendiente
